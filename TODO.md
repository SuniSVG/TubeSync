# Fix Google OAuth Login Loop - Database Error Saving New User

**Status**: Approved ✅ | Progress: 0/5 steps

## Breakdown of Approved Plan

### ✅ 1. Create TODO.md (Completed)

### ✅ 2. Update database/supabase_schema.sql
- Added INSERT RLS policy \"Service role manages profiles\" 
- Improved `handle_new_user()` with UPSERT duplicate handling
- Added orphaned profile cleanup

### ✅ 3. Add error handling to dashboard pages
```
✅ app/dashboard/layout.tsx: OAuth error param detection → /login?auth_error=
✅ app/dashboard/page.tsx: Clear error params on load
✅ app/login/page.tsx: Handle auth_error=database_user_creation w/ friendly message
```

### ⏳ 4. Test & Deploy
```
1. Copy updated database/supabase_schema.sql → Supabase SQL Editor → Run
2. railway up (or git push → Railway auto-deploy)
3. Test: New incognito → Google OAuth → Should land on dashboard ✅
```

**Next**: Run schema in Supabase → Deploy → Test

### ⏳ 4. Test & Deploy
```
1. Run schema changes in Supabase dashboard
2. railway up (deploy)
3. Test: New incognito → Google OAuth → Dashboard
```

### ⏳ 5. Verify & Cleanup
```
Monitor Supabase Edge Logs
Update TODO.md → attempt_completion
```

**Next Step**: Edit `database/supabase_schema.sql`

