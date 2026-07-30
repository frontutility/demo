<?php

declare(strict_types=1);

use ConnectNKT\Controllers\AdminBlueTickController;
use ConnectNKT\Controllers\AdminAuthController;
use ConnectNKT\Controllers\AdminNewsController;
use ConnectNKT\Controllers\AdminCmsController;
use ConnectNKT\Controllers\AdminDashboardController;
use ConnectNKT\Controllers\AdminHelpCenterController;
use ConnectNKT\Controllers\AdminPollController;
use ConnectNKT\Controllers\AdminPostController;
use ConnectNKT\Controllers\AdminReportController;
use ConnectNKT\Controllers\AdminSettingsController;
use ConnectNKT\Controllers\AdminUserController;
use ConnectNKT\Controllers\AdminVillageController;
use ConnectNKT\Controllers\AdminDonationController;
use ConnectNKT\Controllers\DonationController;
use ConnectNKT\Controllers\AuthController;
use ConnectNKT\Controllers\BlueTickController;
use ConnectNKT\Controllers\BusinessAdminController;
use ConnectNKT\Controllers\BusinessController;
use ConnectNKT\Controllers\CmsController;
use ConnectNKT\Controllers\CommentController;
use ConnectNKT\Controllers\ContactQueryController;
use ConnectNKT\Controllers\HelpCenterController;
use ConnectNKT\Controllers\NewsController;
use ConnectNKT\Controllers\PostCategoryController;
use ConnectNKT\Controllers\PostController;
use ConnectNKT\Controllers\ReportController;
use ConnectNKT\Controllers\UserController;
use ConnectNKT\Controllers\UserSettingsController;
use ConnectNKT\Controllers\VillageController;
use ConnectNKT\Controllers\NavigationController;
use ConnectNKT\Core\Database;
use ConnectNKT\Helpers\Response;
use ConnectNKT\Models\SiteSetting;
use ConnectNKT\Middleware\AdminMiddleware;
use ConnectNKT\Middleware\AuthMiddleware;
use ConnectNKT\Middleware\UserStatusMiddleware;
use ConnectNKT\Middleware\RateLimitMiddleware;

$auth = new AuthMiddleware();
$admin = new AdminMiddleware();
$userStatus = new UserStatusMiddleware();
$rateLimitAuth = new RateLimitMiddleware(20, 60);
$rateLimitPublic = new RateLimitMiddleware(60, 60);
$rateLimitMutation = new RateLimitMiddleware(120, 60);

$router->get('/', static function () {
    Response::success([
        'service' => 'ConnectNKT Backend',
        'status' => 'running',
        'version' => '1.0.0',
    ], 'Backend running');
});

$router->get('/api/health', static function () {
    try {
        Database::pdo()->query('SELECT 1');
        Response::success([
            'service' => 'ConnectNKT API',
            'database' => 'connected',
            'timestamp' => date('c'),
        ], 'Health OK');
    } catch (\Throwable $e) {
        error_log('[health] database check failed: ' . $e->getMessage());
        Response::error('Health check failed', 500);
    }
});

$router->post('/api/auth/register', [AuthController::class, 'register'], [$rateLimitAuth]);
$router->post('/api/auth/login', [AuthController::class, 'login'], [$rateLimitAuth]);
$router->post('/api/auth/email-login', [AuthController::class, 'emailLogin'], [$rateLimitAuth]);
$router->post('/api/auth/username-login', [AuthController::class, 'usernameLogin'], [$rateLimitAuth]);
$router->post('/api/auth/register/request-otp', [AuthController::class, 'requestRegistrationOtp'], [$rateLimitAuth]);
$router->post('/api/auth/register/verify-otp', [AuthController::class, 'verifyRegistrationOtp'], [$rateLimitAuth]);
$router->post('/api/auth/forgot-password', [AuthController::class, 'requestPasswordResetOtp'], [$rateLimitAuth]);
$router->post('/api/auth/forgot-password/verify-otp', [AuthController::class, 'verifyPasswordResetOtp'], [$rateLimitAuth]);
$router->post('/api/auth/reset-password', [AuthController::class, 'resetPassword'], [$rateLimitAuth]);
$router->post('/api/auth/change-password', [AuthController::class, 'changePassword'], [$auth, $userStatus]);
$router->get('/api/auth/csrf-token', [AuthController::class, 'csrfToken'], [$auth, $userStatus]);
$router->post('/api/auth/logout', [AuthController::class, 'logout'], [$auth, $userStatus]);
$router->get('/api/auth/me', [AuthController::class, 'me']);
$router->post('/api/auth/check-username', [AuthController::class, 'checkUsername'], [$rateLimitPublic]);
$router->get('/api/user/:username', [UserController::class, 'showByUsername'], [$auth, $userStatus]);

$router->post('/api/admin/auth/login', [AdminAuthController::class, 'login'], [$rateLimitAuth]);
$router->post('/api/admin/auth/logout', [AdminAuthController::class, 'logout'], [$auth, $admin]);
$router->get('/api/admin/auth/me', [AdminAuthController::class, 'me'], [$auth, $admin]);

$router->get('/api/users', [UserController::class, 'index']);
$router->get('/api/users/top', [UserController::class, 'top']);
$router->get('/api/users/suggestions', [UserController::class, 'suggestions'], [$auth, $userStatus]);
$router->get('/api/users/search', [UserController::class, 'search']);
$router->get('/api/users/:id', [UserController::class, 'show'], [$auth, $userStatus]);
$router->put('/api/users/:id', [UserController::class, 'update'], [$auth, $userStatus]);
$router->delete('/api/users/:id', [UserController::class, 'destroy'], [$auth, $userStatus]);
$router->post('/api/users/:id/delete-account', [UserController::class, 'deleteAccount'], [$auth, $userStatus]);
$router->post('/api/users/:id/hide', [UserController::class, 'hide'], [$auth, $userStatus]);
$router->post('/api/users/:id/restore', [UserController::class, 'restore'], [$auth, $userStatus]);
$router->post('/api/users/:id/suspend', [UserController::class, 'suspend'], [$auth, $admin]);
$router->post('/api/users/:id/avatar', [UserController::class, 'avatar'], [$auth, $userStatus]);
$router->post('/api/users/:id/report', [UserController::class, 'report'], [$auth, $userStatus]);
$router->post('/api/users/:id/follow', [UserController::class, 'follow'], [$auth, $userStatus]);
$router->delete('/api/users/:id/follow', [UserController::class, 'unfollow'], [$auth, $userStatus]);
$router->get('/api/users/:id/followers', [UserController::class, 'followers'], [$auth, $userStatus]);
$router->get('/api/users/:id/following', [UserController::class, 'following'], [$auth, $userStatus]);
$router->get('/api/user-settings/:id', [UserSettingsController::class, 'show'], [$auth, $userStatus]);
$router->put('/api/user-settings/:id', [UserSettingsController::class, 'update'], [$auth, $userStatus]);
$router->get('/api/settings', [AdminSettingsController::class, 'show']);
$router->get('/api/navigation', [NavigationController::class, 'index']);
$router->get('/api/feed', [PostController::class, 'feedLatest']);

$router->get('/api/villages', [VillageController::class, 'index']);
$router->get('/api/villages/:id', [VillageController::class, 'show']);
$router->post('/api/villages', [VillageController::class, 'store'], [$auth, $admin]);
$router->put('/api/villages/:id', [VillageController::class, 'update'], [$auth, $admin]);
$router->delete('/api/villages/:id', [VillageController::class, 'destroy'], [$auth, $admin]);

$router->get('/api/categories', [PostCategoryController::class, 'index']);
$router->get('/api/post-categories', [PostCategoryController::class, 'index']);
$router->get('/api/post-categories/:id', [PostCategoryController::class, 'show']);

$router->get('/api/posts', [PostController::class, 'index']);
$router->get('/api/posts/slug/:slug', [PostController::class, 'showBySlug']);
$router->get('/api/posts/top', [PostController::class, 'top']);
$router->get('/api/posts/:id', [PostController::class, 'show']);
$router->get('/api/post/:id', [PostController::class, 'show']);
$router->post('/api/posts', [PostController::class, 'store'], [$auth, $userStatus, $rateLimitPublic]);
$router->put('/api/posts/:id', [PostController::class, 'update'], [$auth, $userStatus]);
$router->delete('/api/posts/:id', [PostController::class, 'destroy'], [$auth, $userStatus]);
$router->post('/api/posts/:id/hide', [PostController::class, 'hide'], [$auth, $userStatus]);
$router->post('/api/posts/:id/restore', [PostController::class, 'restore'], [$auth, $userStatus]);
$router->post('/api/posts/:id/pin', [PostController::class, 'pin'], [$auth, $userStatus]);
$router->delete('/api/posts/:id/pin', [PostController::class, 'unpin'], [$auth, $userStatus]);
$router->post('/api/posts/:id/global-pin', [PostController::class, 'globalPin'], [$auth, $admin]);
$router->delete('/api/posts/:id/global-pin', [PostController::class, 'globalUnpin'], [$auth, $admin]);
$router->get('/api/posts/feed/latest', [PostController::class, 'feedLatest']);
$router->get('/api/posts/feed/random', [PostController::class, 'feedRandom']);
$router->get('/api/posts/feed/trending', [PostController::class, 'feedTrending']);
$router->get('/api/feed/ranked', [PostController::class, 'feedRanked']);
$router->post('/api/posts/:id/seen', [PostController::class, 'markSeen'], [$auth, $userStatus]);
$router->get('/api/posts/top', [PostController::class, 'top']);
$router->get('/api/posts/category/:id', [PostController::class, 'category']);
$router->get('/api/posts/village/:id', [PostController::class, 'village']);
$router->get('/api/posts/user/:id', [PostController::class, 'user']);
$router->post('/api/posts/:id/react', [PostController::class, 'react'], [$auth, $userStatus]);
$router->delete('/api/posts/:id/react', [PostController::class, 'unreact'], [$auth, $userStatus]);
$router->post('/api/polls/:id/vote', [PostController::class, 'vote'], [$auth, $userStatus]);
$router->post('/api/posts/:id/vote', [PostController::class, 'vote'], [$auth, $userStatus]);
$router->post('/api/posts/:id/share', [PostController::class, 'share'], [$auth, $userStatus, $rateLimitMutation]);
$router->get('/api/posts/:id/comments', [CommentController::class, 'index']);
$router->post('/api/posts/:id/comments', [CommentController::class, 'store'], [$auth, $userStatus, $rateLimitMutation]);

$router->get('/api/comments/:id/replies', [CommentController::class, 'replies']);
$router->post('/api/comments/:id/react', [CommentController::class, 'react'], [$auth, $userStatus, $rateLimitMutation]);
$router->delete('/api/comments/:id/react', [CommentController::class, 'unreact'], [$auth, $userStatus]);
$router->put('/api/comments/:id', [CommentController::class, 'update'], [$auth, $userStatus]);
$router->delete('/api/comments/:id', [CommentController::class, 'destroy'], [$auth, $userStatus]);

$router->get('/api/reports', [ReportController::class, 'index'], [$auth, $admin]);
$router->post('/api/reports', [ReportController::class, 'store'], [$auth, $userStatus, $rateLimitMutation]);
$router->put('/api/reports/:id', [ReportController::class, 'update'], [$auth, $admin]);
$router->delete('/api/reports/:id', [ReportController::class, 'destroy'], [$auth, $admin]);

$router->get('/api/blue-tick/requests', [BlueTickController::class, 'index'], [$auth, $admin]);
$router->post('/api/blue-tick/requests', [BlueTickController::class, 'store'], [$auth, $userStatus, $rateLimitMutation]);
$router->get('/api/users/:id/blue-tick/status', [BlueTickController::class, 'userStatus'], [$auth, $userStatus]);
$router->get('/api/users/:id/blue-tick/eligibility', [BlueTickController::class, 'checkEligibility']);
$router->put('/api/blue-tick/requests/:id/approve', [BlueTickController::class, 'approve'], [$auth, $admin]);
$router->put('/api/blue-tick/requests/:id/reject', [BlueTickController::class, 'reject'], [$auth, $admin]);
$router->put('/api/blue-tick/requests/:id/revoke', [BlueTickController::class, 'revoke'], [$auth, $admin]);

$router->get('/api/pages', [CmsController::class, 'index']);
$router->get('/api/cms/pages', [CmsController::class, 'index']);
$router->get('/api/pages/:slug', [CmsController::class, 'bySlug']);
$router->get('/api/cms/pages/:slug', [CmsController::class, 'bySlug']);
$router->put('/api/cms/pages/:id', [CmsController::class, 'update'], [$auth, $admin]);

$router->get('/api/business/categories', [BusinessController::class, 'categories']);
$router->post('/api/business/register', [BusinessController::class, 'register'], [$auth, $userStatus]);
$router->get('/api/business/my', [BusinessController::class, 'my'], [$auth, $userStatus]);
$router->get('/api/business/list', [BusinessController::class, 'list']);
$router->get('/api/business/details/:id', [BusinessController::class, 'details']);
$router->post('/api/business/:id/follow', [BusinessController::class, 'follow'], [$auth, $userStatus]);
$router->delete('/api/business/:id/follow', [BusinessController::class, 'unfollow'], [$auth, $userStatus]);
$router->get('/api/business/:id/followers', [BusinessController::class, 'followers']);
$router->put('/api/business/update/:id', [BusinessController::class, 'update'], [$auth, $userStatus]);
$router->delete('/api/business/delete/:id', [BusinessController::class, 'delete'], [$auth, $userStatus]);
$router->get('/api/admin/businesses', [BusinessController::class, 'adminIndex'], [$auth, $admin]);
$router->post('/api/admin/business/approve', [BusinessController::class, 'adminApprove'], [$auth, $admin]);
$router->post('/api/admin/business/reject', [BusinessController::class, 'adminReject'], [$auth, $admin]);
$router->post('/api/admin/business/suspend', [BusinessController::class, 'adminSuspend'], [$auth, $admin]);
$router->post('/api/admin/business/restore', [BusinessController::class, 'adminRestore'], [$auth, $admin]);
$router->post('/api/admin/business/verify', [BusinessController::class, 'adminVerify'], [$auth, $admin]);
$router->post('/api/admin/business/revoke', [BusinessController::class, 'adminRevoke'], [$auth, $admin]);
$router->get('/api/admin/business/:id/followers', [BusinessController::class, 'adminFollowers'], [$auth, $admin]);
$router->post('/api/admin/business/:id/followers', [BusinessController::class, 'adminUpdateFollowers'], [$auth, $admin]);
$router->get('/api/admin/business-categories', [BusinessAdminController::class, 'categoriesIndex'], [$auth, $admin]);
$router->post('/api/admin/business-categories', [BusinessAdminController::class, 'categoriesStore'], [$auth, $admin]);
$router->put('/api/admin/business-categories/:id', [BusinessAdminController::class, 'categoriesUpdate'], [$auth, $admin]);
$router->delete('/api/admin/business-categories/:id', [BusinessAdminController::class, 'categoriesDelete'], [$auth, $admin]);

$router->get('/api/help-center', [HelpCenterController::class, 'index']);
$router->get('/api/help-center/search', [HelpCenterController::class, 'index']);
$router->get('/api/help-center/:slug', [HelpCenterController::class, 'bySlug']);
$router->post('/api/help-center', [HelpCenterController::class, 'store'], [$auth, $admin]);
$router->put('/api/help-center/:id', [HelpCenterController::class, 'update'], [$auth, $admin]);
$router->delete('/api/help-center/:id', [HelpCenterController::class, 'destroy'], [$auth, $admin]);
$router->post('/api/help-center/:id/vote', [HelpCenterController::class, 'vote'], [$auth, $userStatus, $rateLimitMutation]);

$router->get('/api/news', [NewsController::class, 'index']);
$router->get('/api/news/:slug', [NewsController::class, 'bySlug']);

$router->post('/api/contact-queries', [ContactQueryController::class, 'store'], [$rateLimitPublic]);
$router->get('/api/contact-queries', [ContactQueryController::class, 'index'], [$auth, $admin]);

$router->get('/api/admin/dashboard', [AdminDashboardController::class, 'index'], [$auth, $admin]);
$router->get('/api/admin/navigation', [NavigationController::class, 'adminIndex'], [$auth, $admin]);
$router->post('/api/admin/navigation', [NavigationController::class, 'store'], [$auth, $admin]);
$router->patch('/api/admin/navigation/:id', [NavigationController::class, 'update'], [$auth, $admin]);
$router->get('/api/admin/users/counts', [AdminUserController::class, 'counts'], [$auth, $admin]);
$router->get('/api/admin/users', [AdminUserController::class, 'index'], [$auth, $admin]);
$router->get('/api/admin/deleted-users', [AdminUserController::class, 'deleted'], [$auth, $admin]);
$router->get('/api/admin/deleted-users/:id', [AdminUserController::class, 'showDeleted'], [$auth, $admin]);
$router->delete('/api/admin/deleted-users/:id', [AdminUserController::class, 'permanentDelete'], [$auth, $admin]);
$router->get('/api/admin/users/:id', [AdminUserController::class, 'show'], [$auth, $admin]);
$router->put('/api/admin/users/:id', [AdminUserController::class, 'update'], [$auth, $admin]);
$router->patch('/api/admin/users/:id/blue-tick', [AdminUserController::class, 'updateBlueTick'], [$auth, $admin]);
$router->patch('/api/admin/users/:id/visibility', [AdminUserController::class, 'updateVisibility'], [$auth, $admin]);
$router->delete('/api/admin/users/:id', [AdminUserController::class, 'destroy'], [$auth, $admin]);
$router->get('/api/admin/posts', [AdminPostController::class, 'index'], [$auth, $admin]);
$router->get('/api/admin/posts/:id', [AdminPostController::class, 'show'], [$auth, $admin]);
$router->put('/api/admin/posts/:id', [AdminPostController::class, 'update'], [$auth, $admin]);
$router->patch('/api/admin/posts/:id/hide', [AdminPostController::class, 'hide'], [$auth, $admin]);
$router->patch('/api/admin/posts/:id/restore', [AdminPostController::class, 'restore'], [$auth, $admin]);
$router->post('/api/admin/posts/:id/global-pin', [AdminPostController::class, 'globalPin'], [$auth, $admin]);
$router->delete('/api/admin/posts/:id/global-pin', [AdminPostController::class, 'globalUnpin'], [$auth, $admin]);
$router->delete('/api/admin/posts/:id', [AdminPostController::class, 'destroy'], [$auth, $admin]);

$router->get('/api/admin/polls', [AdminPollController::class, 'index'], [$auth, $admin]);
$router->get('/api/admin/polls/:id', [AdminPollController::class, 'show'], [$auth, $admin]);
$router->put('/api/admin/polls/:id', [AdminPollController::class, 'update'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/results', [AdminPollController::class, 'updateResults'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/open', [AdminPollController::class, 'open'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/close', [AdminPollController::class, 'close'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/extend-expiry', [AdminPollController::class, 'extendExpiry'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/clear-expiry', [AdminPollController::class, 'clearExpiry'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/feature', [AdminPollController::class, 'feature'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/unfeature', [AdminPollController::class, 'unfeature'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/pin', [AdminPollController::class, 'pin'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/unpin', [AdminPollController::class, 'unpin'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/lock', [AdminPollController::class, 'lock'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/unlock', [AdminPollController::class, 'unlock'], [$auth, $admin]);
$router->patch('/api/admin/polls/:id/hide', [AdminPollController::class, 'hide'], [$auth, $admin]);
$router->patch('/api/admin/polls/:id/restore', [AdminPollController::class, 'restore'], [$auth, $admin]);
$router->delete('/api/admin/polls/:id', [AdminPollController::class, 'softDelete'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/restore-delete', [AdminPollController::class, 'restoreDelete'], [$auth, $admin]);
$router->delete('/api/admin/polls/:id/permanent', [AdminPollController::class, 'destroy'], [$auth, $admin]);
$router->get('/api/admin/polls/:id/voters', [AdminPollController::class, 'voters'], [$auth, $admin]);
$router->post('/api/admin/polls/:id/reset-votes', [AdminPollController::class, 'resetVotes'], [$auth, $admin]);
$router->get('/api/admin/polls/stats', [AdminPollController::class, 'stats'], [$auth, $admin]);
$router->get('/api/admin/news', [AdminNewsController::class, 'index'], [$auth, $admin]);
$router->get('/api/admin/news/:id', [AdminNewsController::class, 'show'], [$auth, $admin]);
$router->post('/api/admin/news', [AdminNewsController::class, 'store'], [$auth, $admin]);
$router->put('/api/admin/news/:id', [AdminNewsController::class, 'update'], [$auth, $admin]);
$router->patch('/api/admin/news/:id/hide', [AdminNewsController::class, 'hide'], [$auth, $admin]);
$router->patch('/api/admin/news/:id/publish', [AdminNewsController::class, 'publish'], [$auth, $admin]);
$router->delete('/api/admin/news/:id', [AdminNewsController::class, 'destroy'], [$auth, $admin]);
$router->get('/api/admin/villages', [AdminVillageController::class, 'index'], [$auth, $admin]);
$router->post('/api/admin/villages', [VillageController::class, 'store'], [$auth, $admin]);
$router->put('/api/admin/villages/:id', [VillageController::class, 'update'], [$auth, $admin]);
$router->delete('/api/admin/villages/:id', [VillageController::class, 'destroy'], [$auth, $admin]);
$router->get('/api/admin/reports', [AdminReportController::class, 'index'], [$auth, $admin]);
$router->get('/api/admin/reports/posts', [AdminReportController::class, 'postReports'], [$auth, $admin]);
$router->get('/api/admin/reports/users', [AdminReportController::class, 'userReports'], [$auth, $admin]);
$router->put('/api/admin/reports/:id', [AdminReportController::class, 'update'], [$auth, $admin]);
$router->delete('/api/admin/reports/:id', [AdminReportController::class, 'destroy'], [$auth, $admin]);
$router->get('/api/admin/blue-ticks', [AdminBlueTickController::class, 'index'], [$auth, $admin]);
$router->get('/api/admin/cms', [AdminCmsController::class, 'index'], [$auth, $admin]);
$router->get('/api/admin/cms/:id', [AdminCmsController::class, 'show'], [$auth, $admin]);
$router->post('/api/admin/cms', [AdminCmsController::class, 'store'], [$auth, $admin]);
$router->put('/api/admin/cms/:id', [AdminCmsController::class, 'update'], [$auth, $admin]);
$router->patch('/api/admin/cms/:id/publish', [AdminCmsController::class, 'publish'], [$auth, $admin]);
$router->patch('/api/admin/cms/:id/hide', [AdminCmsController::class, 'hide'], [$auth, $admin]);
$router->delete('/api/admin/cms/:id', [AdminCmsController::class, 'destroy'], [$auth, $admin]);
$router->get('/api/admin/help-center', [AdminHelpCenterController::class, 'index'], [$auth, $admin]);
$router->get('/api/admin/settings', [AdminSettingsController::class, 'show'], [$auth, $admin]);
$router->post('/api/admin/settings/logo', [AdminSettingsController::class, 'uploadLogo'], [$auth, $admin]);
$router->put('/api/admin/settings', [AdminSettingsController::class, 'update'], [$auth, $admin]);

// Donation Settings Routes
$router->get('/api/donation-settings', [DonationController::class, 'show']);
$router->get('/api/admin/donation-settings', [AdminDonationController::class, 'show'], [$auth, $admin]);
$router->put('/api/admin/donation-settings', [AdminDonationController::class, 'update'], [$auth, $admin]);
$router->post('/api/admin/donation-settings/qr', [AdminDonationController::class, 'uploadQR'], [$auth, $admin]);
