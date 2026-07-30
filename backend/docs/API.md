# ConnectNKT API Overview

## Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/change-password`
- `GET /api/auth/me`
- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/auth/me`

## Users
- `GET /api/users`
- `GET /api/users/search`
- `GET /api/users/:id`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/users/:id/hide`
- `POST /api/users/:id/restore`
- `POST /api/users/:id/suspend`
- `POST /api/users/:id/avatar`
- `POST /api/users/:id/follow`
- `DELETE /api/users/:id/follow`
- `GET /api/users/:id/followers`
- `GET /api/users/:id/following`

## Posts
- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/feed/latest`
- `GET /api/posts/feed/random`
- `GET /api/posts/feed/trending`
- `GET /api/posts/category/:id`
- `GET /api/posts/village/:id`
- `GET /api/posts/user/:id`
- `POST /api/posts/:id/react`
- `DELETE /api/posts/:id/react`
- `GET /api/posts/:id/comments`
- `POST /api/posts/:id/comments`

## Moderation
- `GET /api/reports`
- `POST /api/reports`
- `GET /api/blue-tick/requests`
- `POST /api/blue-tick/requests`
- `GET /api/notifications`

## Content
- `GET /api/cms/pages`
- `GET /api/cms/pages/:slug`
- `GET /api/help-center`
- `GET /api/help-center/:slug`
- `POST /api/contact-queries`

## Admin
- `GET /api/admin/dashboard`
- `GET /api/admin/users`
- `GET /api/admin/posts`
- `GET /api/admin/villages`
- `GET /api/admin/reports`
- `GET /api/admin/blue-ticks`
- `GET /api/admin/cms`
- `GET /api/admin/help-center`
- `GET /api/admin/settings`
