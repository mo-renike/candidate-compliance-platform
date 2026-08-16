# Code Review: `GET /candidates`

The submitted endpoint:

```js
app.get("/candidates", async (req, res) => {
  const tenantId = req.query.tenantId;
  const search = req.query.search;
  const sql = `SELECT * FROM candidates WHERE name LIKE '%${search}%'`;
  const rows = await db.raw(sql);
  console.log("Returned candidates", rows);
  res.json(rows);
});
```

I'd block this in review. Below are the issues I'd raise, ordered by severity, with the fix for each.

## 1. SQL injection (critical)

`search` is interpolated directly into a raw SQL string with no escaping or parameterization. Any client can pass something like `search=' OR '1'='1' UNION SELECT * FROM audit_event -- ` and read or manipulate arbitrary data, including other tenants'.

**Fix:** never build SQL with string interpolation. Use parameterized queries or an ORM/query builder that parameterizes for you.

## 2. Tenant isolation is completely broken (critical)

Two separate problems compound here:

- `tenantId` is read from `req.query`, meaning any client can simply omit it, or set it to another tenant's ID, and the API will happily honor it. Tenant context must never be client-supplied; it has to be derived from the authenticated principal (the JWT claims / session), not a query parameter.
- Even more seriously, `tenantId` is parsed out of the query string but **never used** in the SQL at all. The `WHERE` clause only filters on `name LIKE ...`. This means the endpoint returns every candidate across every tenant on every call, the exact violation the platform's core isolation rule exists to prevent.

**Fix:** derive `tenantId` from the authenticated request context (e.g. `req.user.tenantId` set by a JWT guard), and include it in the query's `WHERE` clause as a required, non-optional condition, ideally in combination with RLS at the database level so a missing or wrong tenant scope fails closed rather than open.

## 3. No authentication or authorization

There's no guard on this route at all. It's reachable by anyone, authenticated or not, with no permission check for who's allowed to list candidates.

**Fix:** apply an auth guard (JWT) plus an explicit per-operation permission check (e.g. `READ_CANDIDATE`), not a single global "is logged in" gate.

## 4. Sensitive data logged in plaintext

```js
console.log("Returned candidates", rows);
```

This writes full candidate records, names, emails, whatever other PII the table holds, into application logs on every request. Depending on where logs are shipped (aggregators, third-party log services), this can itself become a compliance and data-exposure problem, and it's pure noise at any real traffic volume.

**Fix:** don't log response payloads. If request-level observability is needed, log metadata only (route, tenant id, row count, latency), never row contents.

## 5. No pagination

`SELECT *` with no `LIMIT`/`OFFSET` returns the entire matching set in one response. On a table with any real volume, this is a performance and availability risk, and a trivial way to pull an entire tenant's candidate list in one request even if isolation is fixed.

**Fix:** require `page`/`limit` query params (with sane defaults and a max), and return pagination metadata alongside the data.

## 6. No input validation

`search` is used with no type or length check. Besides enabling the injection above, an unbounded string turns into an unbounded `LIKE '%...%'` scan, and unescaped `%`/`_` characters let a client manipulate the search pattern in unintended ways.

**Fix:** validate `search` as an optional, length-bounded string via a DTO (e.g. `class-validator`), and escape LIKE wildcard characters if a literal-text search is intended.

## 7. `SELECT *` over-fetches

Returning every column exposes any sensitive or internal field added to the table in the future by default, with no explicit allow-list of what the API is meant to expose.

**Fix:** select only the fields the response actually needs, or shape the response through a DTO/serializer.

## 8. No error handling

There's no `try`/`catch`. A malformed query, a DB connection issue, or (currently) the injected SQL itself throwing will produce an unhandled rejection, at best an ugly 500 with a raw stack trace leaked to the client, at worst a crashed process depending on the runtime's unhandled-rejection behavior.

**Fix:** wrap in `try`/`catch`, return errors in the API's standard problem-details format, and never leak internal error detail to the client.

## 9. No audit trail

The platform requires every sensitive read of candidate data to write an audit event. This endpoint reads candidate PII and records nothing.

**Fix:** write an audit `READ` event (tenant, actor, record type, record ids) alongside the response, consistent with how reads are audited elsewhere in the API.

## Fixed version, in this codebase's actual conventions

```ts
// candidates.controller.ts
@Get()
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
@RequirePermissions(Permission.READ_CANDIDATE)
findAll(
  @CurrentUser() user: AuthenticatedUser,
  @Query() query: ListCandidatesDto,
) {
  return this.candidatesService.getAllCandidates(user.tenantId, user.id, query);
}
```

```ts
// candidates.service.ts
async getAllCandidates(
  tenantId: string,
  actorId: string,
  query: ListCandidatesDto,
) {
  const { page = 1, limit = 20, search } = query;

  const where = {
    tenantId,
    ...(search && {
      name: { contains: search, mode: 'insensitive' as const },
    }),
  };

  return this.tenantTransaction.execute(tenantId, async (tx) => {
    const [data, total] = await Promise.all([
      tx.candidate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      tx.candidate.count({ where }),
    ]);

    await this.auditService.recordRead(tx, {
      tenantId,
      actorId,
      recordType: 'Candidate',
      recordId: `list:${data.map((c) => c.id).join(',')}`,
      record: { count: data.length, page },
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });
}
```

```ts
// list-candidates.dto.ts
export class ListCandidatesDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
}
```

This removes the raw SQL entirely (Prisma parameterizes automatically), derives `tenantId` from the authenticated user rather than trusting client input, adds the guard/permission chain, validates and bounds `search`, paginates, and records an audit read, no behavior here is invented, it mirrors the same `tenantTransaction` + `AuditService` pattern already used across the rest of this codebase.
