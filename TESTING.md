# Smoke Test Checklist

## Auth
- [ ] Register new user
- [ ] Duplicate email shows error
- [ ] Login with valid credentials
- [ ] Invalid login shows error
- [ ] Logout works

## Dashboard
- [ ] Projects load
- [ ] Create project works
- [ ] Delete project works

## Project Page
- [ ] Project loads
- [ ] Members load
- [ ] Messages load
- [ ] Send message works
- [ ] Realtime update works
- [ ] Refresh works

## Auth Protection
- [ ] Logged out user is redirected from /dashboard
- [ ] Logged out user is redirected from /project/:id