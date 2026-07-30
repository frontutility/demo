# ConnectNKT Platform Rules

## Single Source of Truth

This document is the official single source of truth for all ConnectNKT platform rules, limits, policies, and behaviors. All frontend pages (Privacy Policy, Terms & Conditions, Community Guidelines, Help Center, FAQ), backend validations, and future implementations MUST reference this document.

---

## User Account Rules

| Rule | Details | Status |
|------|---------|--------|
| Registration Required Fields | `name`, `username`, `email`, `phone`, `password`, `father_name`, `village_id`, `dob`, `gender` | Implemented |
| Terms Acceptance | Must agree to terms of service before registration | Implemented |
| Phone Number | Must be exactly 10 digits (numeric only, stripped of non-numeric characters) | Implemented |
| Village | Must be a valid existing village_id | Implemented |
| Gender | Must be one of: `male`, `female`, `other`, `prefer_not_to_say` | Implemented |
| Username Uniqueness | Must be unique across all users | Implemented |
| Email Uniqueness | Must be unique and valid email format | Implemented |
| Phone Uniqueness | Must be unique (10-digit) | Implemented |
| Password Length | Minimum 6 characters (frontend only, no explicit backend validation for minimum length beyond hashing) | Implemented (Partial) |
| Age Requirement | Must be at least 18 years old (Date of Birth ≤ today minus 18 years) | Implemented |
| Login Credentials | Can use either username or email plus password | Implemented |
| Account Status Check | Suspended accounts cannot log in | Implemented |
| Username Change Policy | **Status**: Not Implemented<br>**Recommendation**: Add username change rules with cooldown period (e.g., once every 30 days) and validation (no reserved words, no impersonation) | Recommended |
| Email Verification | **Status**: Not Implemented<br>**Recommendation**: Implement email verification for new accounts and email changes | Recommended |
| Phone Verification | **Status**: Not Implemented<br>**Recommendation**: Implement phone number verification via OTP for account registration and recovery | Recommended |

---

## Profile Rules

| Rule | Details | Status |
|------|---------|--------|
| Privacy Settings Visibility | Profile visibility: `public`, `followers`, or `private` | Implemented |
| Email Visibility | `public`, `followers`, or `private` | Implemented |
| Phone Visibility | `public`, `followers`, or `private` | Implemented |
| Followers List Visibility | `public`, `followers`, or `private` | Implemented |
| Following List Visibility | `public`, `followers`, or `private` | Implemented |
| Show in Search | Boolean (0 or 1) | Implemented |
| Avatar Upload | Must be PNG, base64 encoded, max size 200 KB | Implemented |
| Cover Image | **Status**: Not Implemented<br>**Recommendation**: Add cover image support with size and aspect ratio constraints | Recommended |
| Bio Length | **Status**: Not Implemented<br>**Recommendation**: Set maximum bio length (e.g., 250 characters) | Recommended |
| Website Limits | **Status**: Not Implemented<br>**Recommendation**: Add website field with validation for valid URLs and no malicious links | Recommended |

---

## Post Rules

| Rule | Details | Status |
|------|---------|--------|
| Post Types | `text`, `image`, `image_text`, `poll` | Implemented |
| Post Permissions | Text Post and Poll Post always enabled. Image Post and Image+Text Post are admin-controlled per user | Implemented |
| Daily Post Limit | 5 posts per calendar day for normal users (admins exempt) | Implemented |
| Post Word Limit | Maximum 250 words | Implemented |
| Post Content Required | For `text`, `image_text`, and `poll` (poll question counts as content) | Implemented |
| Poll Rules | Poll question required; exactly 2‑5 options | Implemented |
| Image Upload | Base64 encoded; allowed formats: `png`, `jpeg`, `jpg`, `gif`, `webp` | Implemented |
| Post Pinning (User) | User can pin exactly one own post at a time | Implemented |
| Global Pinning (Admin) | Admins can globally pin exactly one post at a time | Implemented |
| Hide/Restore Posts | Only admins can hide or restore posts | Implemented |
| Posts from Hidden/Suspended Users | Hidden or suspended users' posts may be excluded from feeds like top posts | Implemented |
| Poll Expiration | Polls expire exactly 7 days after creation | Implemented |
| Draft Rules | **Status**: Not Implemented<br>**Recommendation**: Add draft saving and publishing | Recommended |
| Scheduled Post Rules | **Status**: Not Implemented<br>**Recommendation**: Add scheduled post functionality with time zone support | Recommended |
| Edit Permissions | **Status**: Not Implemented<br>**Recommendation**: Allow post editing only for a limited time after creation (e.g., 15 minutes) and lock edits after first reaction/comment | Recommended |
| Delete Permissions | **Status**: Implemented (users can delete own posts) | Implemented |

---

## Business Rules

| Rule | Details | Status |
|------|---------|--------|
| Required Business Fields | `business_name`, `owner_name`, `address`, `established_year`, `phone`, `email`, `category_id`, `village_id`, `logo/image` | Implemented |
| Tagline Limit | Maximum 10 words | Implemented |
| Description Limit | Maximum 200 words | Implemented |
| Maximum Businesses per User | 3 businesses per account (admins exempt) | Implemented |
| Business Verification | Auto‑verified when ≥ 500 followers; un‑verified if followers drop below 500 | Implemented |
| Business Visibility | Only businesses with `approved` status are publicly listed | Implemented |
| Featured Business Rules | **Status**: Not Implemented<br>**Recommendation**: Add featured business functionality with admin approval | Recommended |

---

## Comment Rules

| Rule | Details | Status |
|------|---------|--------|
| Nested Replies | Comments support nested replies | Implemented |
| Comment Reactions | Agree/Disagree reactions for comments | Implemented |
| Delete Permissions | Comment owner or admin can delete | Implemented |
| Edit Permissions | **Status**: Not Implemented<br>**Recommendation**: Allow comment editing for limited time, with edit history visibility | Recommended |
| Maximum Comment Length | **Status**: Not Implemented<br>**Recommendation**: Set maximum comment length (e.g., 500 characters) | Recommended |

---

## Feed Rules

| Rule | Details | Status |
|------|---------|--------|
| Feed Scoring Factors | Global pinned (+500), age (≤3 h +30, ≤24 h +20, ≤7 d +8), engagement (agrees + comments × 2 + shares × 3, max 20), recent reactions/comments (×3/×5, max 40), followed user (+25), same village (+40), blue tick (+10), category interest (0‑15), seen count (-5 if ≥1, -20 if ≥3, -60 if ≥10), reports (-8 × report_count -8 × spam_report_count, max -60) | Implemented |
| Feed Quality Filter | Posts with ≥ 10 reports are excluded from the ranked feed | Implemented |
| Global Pinned Priority | Show first in feeds, sorted by `globally_pinned_at` desc | Implemented |
| Feed Bucket Slots | `recent`, `trending`, `nearby`, `following`, `recent`, `discover`, `recent`, `trending`, `nearby`, `recent`, `following`, `trending`, `discover`, `recent`, `nearby`, `recent`, `old_viral`, `trending`, `recent`, `recent` | Implemented |
| Author Diversity | Consecutive posts in ranked feed are from different authors when possible | Implemented |
| Profile Suggestions Frequency | Configurable via admin (`suggestion_insertion_frequency`, default every 15 posts) | Implemented |
| Suggested Profiles Carousel Size | Configurable via admin (`suggestion_carousel_size`, default 10 profiles) | Implemented |
| Suggestions Enabled | Configurable via admin (`enable_profile_suggestions`) | Implemented |

---

## Follow Rules

| Rule | Details | Status |
|------|---------|--------|
| Self‑Follow Prohibited | Cannot follow yourself | Implemented |
| Follow Target Status | Can only follow active, non‑deleted accounts | Implemented |
| Blocked Users | **Status**: Not Implemented<br>**Recommendation**: Implement blocking system to prevent blocked users from interacting | Recommended |
| Private Profiles | **Status**: Not Implemented<br>**Recommendation**: Allow private profiles with follow‑request system | Recommended |

---

## Report Rules

| Rule | Details | Status |
|------|---------|--------|
| Report Reasons | `Spam`, `Fake Information`, `Harassment`, `Hate Speech`, `Violence`, `Adult Content`, `Child Safety`, `Terrorism`, `Scam`, `Impersonation`, `Copyright`, `Other` | Implemented |
| Custom Reason | Required when reason is "Other"; max 50 words | Implemented |
| Auto‑Hide Post | Hide post when it has ≥ 20 reports | Implemented |
| Auto‑Hide User | Hide user when they have ≥ 20 reports | Implemented |
| Duplicate Report Prevention | **Status**: Not Implemented<br>**Recommendation**: Prevent duplicate reports from same user on same target | Recommended |
| Report Thresholds | **Status**: Implemented (≥ 20 reports for auto‑hide) | Implemented |

---

## Blue Tick Rules

| Rule | Details | Status |
|------|---------|--------|
| Eligibility Requirement | ≥ 500 followers to request blue tick | Implemented |
| Pending Request Limit | Cannot request if there’s already a pending request | Implemented |
| Already Verified | Cannot request if already verified | Implemented |
| Admin Actions | Admin can approve, reject, or revoke blue tick requests | Implemented |
| Required Documents | **Status**: Not Implemented<br>**Recommendation**: Add document upload requirement for verification (ID, business proof, etc.) | Recommended |

---

## Event Rules

| Rule | Details | Status |
|------|---------|--------|
| Event Date Cannot Be in Past | Event date must be today or later | Implemented |
| Frontend Visibility | Visible for 15 days after creation (`frontend_visible_until = created_at +15 days`) | Implemented |
| Fake Event Policy | **Status**: Not Implemented<br>**Recommendation**: Add policy and moderation for fake events with warning, suspension, or account termination | Recommended |
| Required Event Information | `event_title`, `category`, `organizer_name`, `organizer_phone`, `event_description`, `banner_image`, `event_date`, `venue_name`, `full_address`, `village_area`, `whatsapp_number` | Implemented |
| Supported Categories | `Shop Opening`, `Celebration`, `Religious Program`, `Social & Community Event`, `Education & Sports`, `Birthday Celebration`, `Bhajan Sandhya`, `Education Seminar`, `Sports Event`, `Blood Donation Camp`, `Plantation Drive`, `Cleanliness Campaign`, `Cultural Program`, `Public Meeting`, `Wedding / Reception`, `Anniversary`, `Business Launch`, `Exhibition / Fair`, `Music Event`, `Entertainment Event`, `Social Awareness Program`, `Coaching Seminar`, `Other` | Implemented |

---

## Admin Rules

| Rule | Details | Status |
|------|---------|--------|
| Admin Permissions | Determined by claim type "admin" and role (`super_admin`, `moderator`, `editor`) | Implemented |
| Count Overrides | Admin can set `followers_count_override`, `following_count_override`, `posts_count_override`, `comments_count_override`, `agree_count_override`, `disagree_count_override`, `shares_count_override` on users | Implemented |
| Audit Logs | **Status**: Not Implemented<br>**Recommendation**: Implement comprehensive audit logging for all admin actions (who, what, when) | Recommended |

---

## Rate Limits

| Rule | Details | Status |
|------|---------|--------|
| General API Rate Limit | 60 requests per 60‑second window, tracked by IP + URI | Implemented |
| Per‑Endpoint Rate Limits | **Status**: Not Implemented<br>**Recommendation**: Add specific rate limits for sensitive endpoints (login, registration, follow, post creation) | Recommended |

---

## File/Image Upload Rules

| Rule | Details | Status |
|------|---------|--------|
| Allowed Image Formats | `png`, `jpeg`, `jpg`, `gif`, `webp` | Implemented |
| Avatar Upload Constraints | Must be PNG, base64 encoded, max size 200 KB | Implemented |
| Post Image Limits | **Status**: Not Implemented<br>**Recommendation**: Add maximum file size and dimension limits for post images | Recommended |

---

## Missing Platform Rules

The following rules should be implemented before production:

1. **Username Change Policy**: Define cooldown, validation, and impersonation protection.
2. **Email/Phone Verification**: Add OTP‑based verification for registration and recovery.
3. **Password Security Rules**: Enforce strong password requirements (mix of characters, minimum length, no common passwords).
4. **Blocking System**: Prevent blocked users from interacting (follow, comment, react, message).
5. **Private Profiles**: Implement follow‑request system for private accounts.
6. **Duplicate Report Prevention**: Block repeated reports from same user on same target.
7. **Admin Audit Logs**: Log all admin actions for accountability.
8. **Post Edit/Delete Rules**: Add time limits for post edits, edit history, and delete restrictions.
9. **Comment Edit/Delete Rules**: Add time limits for comment edits, edit history, and delete restrictions.
10. **Post Image Limits**: Add file size and dimension constraints for post images.
11. **Business Featured Rules**: Add featured business functionality with admin approval.
12. **News Publishing Rules**: Define who can publish news, approval process, etc.
13. **Donation Rules**: If future donation feature is added, define approval, payment methods, visibility rules.
14. **Notification Rules**: Define notification preferences, frequency limits, etc.

---
*Last Updated: 2026‑07‑20*