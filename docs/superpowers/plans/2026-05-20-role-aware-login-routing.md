# Role-Aware Login Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public `Operator` entry with `Login` and route authenticated users to `/admin` or `/steward` based on their live AYRA role records.

**Architecture:** Keep Supabase auth unchanged. Add one pure routing helper beside existing AYRA auth role logic, use it in the callback after `claim_current_profile`, and keep explicit protected-route guards as the final authority. The generic `/login` page should no longer assume admin as the default destination.

**Tech Stack:** Next.js App Router, TypeScript, Supabase SSR auth, Node `tsx --test`, ESLint. `{files: 5 modified, LOC/file: src/lib/ayra/auth.ts +35, tests/ayra-auth.test.ts +95, src/app/auth/callback/route.ts +45, src/app/login/page.tsx -10/+12, src/app/page.tsx -1/+1, deps: 0}`

---

## File Structure

- Modify `src/lib/ayra/auth.ts`: add `resolveRoleHomePath(context, requestedNext?)`, a pure helper that maps role context to the best allowed portal.
- Modify `tests/ayra-auth.test.ts`: add unit tests for admin, steward, grantee-contact, applicant-only, and explicit-route fallback behavior.
- Modify `src/app/auth/callback/route.ts`: after successful token verification and profile claiming, load AYRA state, resolve role context, and redirect to the helper-selected route.
- Modify `src/app/login/page.tsx`: make the generic login default neutral instead of `/admin`, and update copy to say the portal is selected after role resolution.
- Modify `src/app/page.tsx`: change the public nav link label from `Operator` to `Login` and point it at `/login`.

No new files, no migrations, no Supabase data changes, no dependencies.

## Task 1: Add Pure Role-Home Tests

**Files:**
- Modify: `tests/ayra-auth.test.ts`
- Modify later: `src/lib/ayra/auth.ts`

- [ ] **Step 1: Write failing tests for role-aware routing**

Add `resolveRoleHomePath` to the import list in `tests/ayra-auth.test.ts`:

```ts
import {
  canSubmitForMilestone,
  requireAdminRole,
  resolveRoleContext,
  resolveEmailOtpType,
  resolveRoleHomePath,
} from "../src/lib/ayra/auth";
```

Append this `describe` block below the existing `describe("AYRA auth role resolution", ...)` block:

```ts
describe("AYRA role-aware portal routing", () => {
  function contextForRoles(roles: UserRole[] = []) {
    return resolveRoleContext({
      profile,
      roles: roles.map((role) => ({ ...role, profileId: profile.id })),
      grantees: [
        {
          id: "grantee-1",
          initiativeId: "initiative-1",
          name: "Ecoparque Iron Wood",
        },
      ],
    });
  }

  it("routes admins to the operator console by default", () => {
    const context = contextForRoles([
      { id: "role-admin", profileId: profile.id, role: "admin" },
    ]);

    assert.equal(resolveRoleHomePath(context), "/admin");
  });

  it("routes steward users to the steward portal by default", () => {
    const context = contextForRoles([
      {
        id: "role-steward",
        profileId: profile.id,
        role: "steward",
        initiativeId: "initiative-1",
      },
    ]);

    assert.equal(resolveRoleHomePath(context), "/steward");
  });

  it("routes grantee contacts to the steward portal by default", () => {
    const context = contextForRoles([
      {
        id: "role-contact",
        profileId: profile.id,
        role: "grantee_contact",
        granteeId: "grantee-1",
      },
    ]);

    assert.equal(resolveRoleHomePath(context), "/steward");
  });

  it("keeps an explicit admin route for admins", () => {
    const context = contextForRoles([
      { id: "role-admin", profileId: profile.id, role: "admin" },
    ]);

    assert.equal(resolveRoleHomePath(context, "/admin"), "/admin");
  });

  it("falls back from explicit admin route to steward portal for non-admin stewards", () => {
    const context = contextForRoles([
      {
        id: "role-steward",
        profileId: profile.id,
        role: "steward",
        initiativeId: "initiative-1",
      },
    ]);

    assert.equal(resolveRoleHomePath(context, "/admin"), "/steward");
  });

  it("keeps an explicit steward route for steward users", () => {
    const context = contextForRoles([
      {
        id: "role-steward",
        profileId: profile.id,
        role: "steward",
        initiativeId: "initiative-1",
      },
    ]);

    assert.equal(resolveRoleHomePath(context, "/steward"), "/steward");
  });

  it("routes applicant-only users back to login with scope-required status", () => {
    const context = contextForRoles([
      { id: "role-applicant", profileId: profile.id, role: "applicant" },
    ]);

    assert.equal(resolveRoleHomePath(context), "/login?status=scope-required");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/ayra-auth.test.ts
```

Expected: FAIL with a TypeScript/runtime error that `resolveRoleHomePath` is not exported from `src/lib/ayra/auth.ts`.

- [ ] **Step 3: Commit test-only failure if using strict TDD checkpoints**

Do not commit if the team prefers green-only commits. If committing red tests is acceptable in this worktree, run:

```bash
git add tests/ayra-auth.test.ts
git commit -m "test: cover role-aware login routing"
```

Expected: commit created only in the dedicated implementation worktree.

## Task 2: Implement Role-Home Helper

**Files:**
- Modify: `src/lib/ayra/auth.ts`
- Test: `tests/ayra-auth.test.ts`

- [ ] **Step 1: Add the pure routing helper**

Append this function to `src/lib/ayra/auth.ts` after `hasStewardPortalAccess`:

```ts
export function resolveRoleHomePath(
  context: RoleContext,
  requestedNext?: string,
) {
  const canUseStewardPortal = hasStewardPortalAccess(context);
  const fallback = context.isAdmin
    ? "/admin"
    : canUseStewardPortal
      ? "/steward"
      : "/login?status=scope-required";

  if (requestedNext === "/admin") {
    return context.isAdmin ? requestedNext : fallback;
  }

  if (requestedNext?.startsWith("/admin/")) {
    return context.isAdmin ? requestedNext : fallback;
  }

  if (requestedNext === "/steward") {
    return canUseStewardPortal ? requestedNext : fallback;
  }

  if (requestedNext?.startsWith("/steward/")) {
    return canUseStewardPortal ? requestedNext : fallback;
  }

  if (requestedNext && requestedNext !== "/login") {
    return requestedNext;
  }

  return fallback;
}
```

- [ ] **Step 2: Run auth tests**

Run:

```bash
npm test -- tests/ayra-auth.test.ts
```

Expected: PASS. The new tests should prove `/admin` falls back to `/steward` for steward roles.

- [ ] **Step 3: Commit helper and tests**

Run:

```bash
git add src/lib/ayra/auth.ts tests/ayra-auth.test.ts
git commit -m "feat: resolve portal route from AYRA roles"
```

Expected: commit created with only the auth helper and tests.

## Task 3: Route Magic-Link Callback Through Role Resolution

**Files:**
- Modify: `src/app/auth/callback/route.ts`
- Read-only reference: `src/lib/ayra/session.ts`
- Read-only reference: `src/lib/ayra/data.ts`

- [ ] **Step 1: Update callback imports**

Replace the current imports at the top of `src/app/auth/callback/route.ts` with:

```ts
import { NextResponse, type NextRequest } from "next/server";

import {
  resolveEmailOtpType,
  resolveRoleContext,
  resolveRoleHomePath,
} from "@/lib/ayra/auth";
import {
  hasPublicSupabaseEnv,
  loadAuthenticatedAyraState,
} from "@/lib/ayra/data";
import { safeNextPath } from "@/lib/ayra/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
```

- [ ] **Step 2: Replace callback success redirect logic**

Replace the current `if (!result.error) { await supabase.rpc("claim_current_profile"); }` block and final redirect construction with:

```ts
  let redirectPath = next;

  if (!result.error && hasPublicSupabaseEnv()) {
    const claimed = await supabase.rpc("claim_current_profile");
    if (!claimed.error && claimed.data) {
      const state = await loadAuthenticatedAyraState(supabase);
      const context = resolveRoleContext({
        profile: {
          id: claimed.data.id,
          email: claimed.data.email,
          displayName: claimed.data.display_name,
          createdAt: claimed.data.created_at,
        },
        roles: state.userRoles,
        grantees: state.grantees,
      });
      redirectPath = resolveRoleHomePath(context, next);
    }
  }

  const redirectUrl = new URL(redirectPath, url.origin);
  if (!result.error && redirectPath.startsWith("/login?")) {
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("status", result.error ? "auth-error" : "signed-in");
  return NextResponse.redirect(redirectUrl);
```

This preserves the existing auth-error behavior, sends scoped stewards to `/steward`, keeps admins on `/admin`, and returns applicant-only users to the login modal with `scope-required`.

- [ ] **Step 3: Run type/build validation**

Run:

```bash
npm test -- tests/ayra-auth.test.ts
npm run lint
npm run build
```

Expected:
- `npm test -- tests/ayra-auth.test.ts`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS with the callback compiling under Next.js.

- [ ] **Step 4: Commit callback routing**

Run:

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat: route login callback by role"
```

Expected: commit created with only callback routing changes.

## Task 4: Make Public Login Entry Neutral

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Change landing nav link**

In `src/app/page.tsx`, replace:

```tsx
          <Link className="public-anchor" href="/admin">
            Operator
          </Link>
```

with:

```tsx
          <Link className="public-anchor" href="/login">
            Login
          </Link>
```

- [ ] **Step 2: Make login default neutral**

In `src/app/login/page.tsx`, replace:

```ts
  const next = safeNextPath(params?.next, "/admin");
```

with:

```ts
  const next = safeNextPath(params?.next, "/login");
```

- [ ] **Step 3: Update login page explanatory copy**

In `src/app/login/page.tsx`, replace:

```tsx
              Operator and steward portals use Supabase magic links. Access is
              resolved from the profile and role records attached to your email.
```

with:

```tsx
              AYRA portals use Supabase magic links. After sign-in, your role
              records route you to the operator console or steward portal.
```

Replace:

```tsx
                Seeded admin and steward emails claim their existing scoped
                records after the magic-link callback.
```

with:

```tsx
                Use the email connected to your application or operator role.
                AYRA will open the portal your account is allowed to use.
```

- [ ] **Step 4: Run local validation**

Run:

```bash
npm test -- tests/ayra-auth.test.ts
npm run lint
```

Expected:
- Auth tests PASS.
- ESLint PASS.

- [ ] **Step 5: Commit UI entry copy**

Run:

```bash
git add src/app/page.tsx src/app/login/page.tsx
git commit -m "fix: make login entry role-neutral"
```

Expected: commit created with only public/login copy changes.

## Task 5: Runtime Verification

**Files:**
- No code edits.
- Runtime surfaces: `/`, `/login`, `/auth/callback`, `/admin`, `/steward`.

- [ ] **Step 1: Run full local validation bundle**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all commands PASS.

- [ ] **Step 2: Start local dev server**

Run:

```bash
npm run dev
```

Expected: Next.js starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 3: Browser smoke the public entry**

Open `http://localhost:3000/`.

Expected:
- Public nav shows `Login`.
- Public nav does not show `Operator`.
- Clicking `Login` opens `/login`, not `/admin`.

- [ ] **Step 4: Browser smoke the neutral login page**

Open `http://localhost:3000/login`.

Expected:
- Page copy says AYRA routes by role.
- Hidden form field `next` has value `/login`.
- No text implies generic login is admin-only.

- [ ] **Step 5: Live account verification for `caposk8@hotmail.com`**

Use `caposk8@hotmail.com` on `/login`, open the magic link, and complete sign-in.

Expected:
- Callback claims the existing profile.
- Account lands on `/steward?status=signed-in` or `/steward` with the signed-in status.
- Account does not land on `/admin?status=admin-required`.

- [ ] **Step 6: Admin regression check**

Use a known admin account from live Supabase, for example `caposk817@gmail.com`, on `/login`.

Expected:
- Callback lands on `/admin?status=signed-in` or `/admin`.
- Admin console still loads.

- [ ] **Step 7: Final commit if runtime verification required code tweaks**

If runtime verification required additional code changes, run:

```bash
git add src/lib/ayra/auth.ts src/app/auth/callback/route.ts src/app/login/page.tsx src/app/page.tsx tests/ayra-auth.test.ts
git commit -m "fix: complete role-aware login verification"
```

Expected: commit created only if files changed after Task 4.

## Self-Review

Spec coverage:
- Rename `Operator` to `Login`: Task 4.
- Generic login decides portal by role: Tasks 2 and 3.
- Admin goes to admin: Tasks 1, 2, 5.
- Steward/grantee-contact goes to steward: Tasks 1, 2, 5.
- Existing protected pages stay role-gated: no guard removal; callback only improves post-login destination.

Placeholder scan:
- No `TBD`, `TODO`, "similar to", or vague edge-case instructions remain.
- Each code-changing step includes exact code.
- Each validation step includes exact commands and expected result.

Type consistency:
- Uses existing `RoleContext`, `UserRole`, `Profile`, `Grantee`, `resolveRoleContext`, `hasStewardPortalAccess`, and `loadAuthenticatedAyraState`.
- Helper name is consistently `resolveRoleHomePath`.
- Route strings are consistently `/login`, `/admin`, and `/steward`.
