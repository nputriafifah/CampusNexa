<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BorrowController;
use App\Http\Controllers\Api\CommunityController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DonateController;
use App\Http\Controllers\Api\FoodController;
use App\Http\Controllers\Api\ItemController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/register/request-otp', [AuthController::class, 'requestRegisterOtp']);
Route::post('/register/resend-otp', [AuthController::class, 'resendRegisterOtp']);
Route::post('/register/verify-otp', [AuthController::class, 'verifyRegisterOtp']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/password/forgot', [AuthController::class, 'requestPasswordResetOtp']);
Route::post('/password/resend-otp', [AuthController::class, 'resendPasswordResetOtp']);
Route::post('/password/reset', [AuthController::class, 'resetPasswordWithOtp']);

Route::get('/categories', [DashboardController::class, 'categories']);
Route::get('/stats/campus', [DashboardController::class, 'publicCampusStats']);
Route::post('/ai/analyze-item', [DashboardController::class, 'analyzeItem']);
Route::post('/ai/predict-food', [FoodController::class, 'predict']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/me', [AuthController::class, 'updateMe']);
    Route::patch('/me/password', [AuthController::class, 'updatePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/bootstrap', [DashboardController::class, 'bootstrap']);
    Route::get('/recommendations/items', [DashboardController::class, 'itemRecommendations']);
    Route::get('/campus-organizations', [DashboardController::class, 'campusOrganizations']);

    Route::get('/items', [ItemController::class, 'index']);
    Route::post('/items', [ItemController::class, 'store']);
    Route::get('/items/{item}', [ItemController::class, 'show']);
    Route::patch('/items/{item}/status', [ItemController::class, 'updateStatus']);
    Route::delete('/items/{item}', [ItemController::class, 'destroy']);
    Route::post('/items/{item}/interests', [ItemController::class, 'sendInterest']);
    Route::post('/items/{item}/favorite', [ItemController::class, 'toggleFavorite']);
    Route::post('/interests/{interest}/replies', [ItemController::class, 'replyInterest']);

    Route::get('/borrows', [BorrowController::class, 'index']);
    Route::post('/borrows', [BorrowController::class, 'store']);
    Route::post('/borrows/{borrowRequest}/respond', [BorrowController::class, 'respond']);
    Route::post('/borrows/{borrowRequest}/return', [BorrowController::class, 'returnItem']);
    Route::post('/borrows/{borrowRequest}/remind', [BorrowController::class, 'remind']);

    Route::get('/foods', [FoodController::class, 'index']);
    Route::post('/foods', [FoodController::class, 'store']);
    Route::get('/foods/{food}', [FoodController::class, 'show']);
    Route::post('/foods/{food}/claim', [FoodController::class, 'claim']);
    Route::post('/foods/{food}/cancel-claim', [FoodController::class, 'cancelClaim']);

    Route::post('/donations/{item}/claim', [DonateController::class, 'claim']);
    Route::post('/donations/{item}/handover', [DonateController::class, 'confirmHandover']);

    Route::get('/community', [CommunityController::class, 'index']);
    Route::get('/community/events/{event}', [CommunityController::class, 'showEvent']);
    Route::post('/community/events/{event}/register', [CommunityController::class, 'registerEvent']);
    Route::post('/community/events/{event}/cancel', [CommunityController::class, 'cancelEvent']);
    Route::get('/community/volunteers/{volunteer}', [CommunityController::class, 'showVolunteer']);
    Route::post('/community/volunteers/{volunteer}/signup', [CommunityController::class, 'signupVolunteer']);
    Route::post('/community/volunteers/{volunteer}/cancel', [CommunityController::class, 'cancelVolunteer']);

    Route::get('/impact', [DashboardController::class, 'impact']);
    Route::get('/announcements', [DashboardController::class, 'announcements']);
    Route::get('/notifications', [DashboardController::class, 'notifications']);
    Route::post('/notifications/read-all', [DashboardController::class, 'markAllNotificationsRead']);
    Route::post('/notifications/{notification}/read', [DashboardController::class, 'markNotificationRead']);

    Route::middleware('role:campus_admin')->prefix('admin')->group(function () {
        Route::get('/overview', [AdminController::class, 'overview']);
        Route::get('/campus-summary', [AdminController::class, 'campusSummary']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::get('/users/{user}', [AdminController::class, 'showUser']);
        Route::patch('/users/{user}/role', [AdminController::class, 'updateUserRole']);
        Route::patch('/users/{user}/status', [AdminController::class, 'updateUserStatus']);
        Route::get('/items', [AdminController::class, 'items']);
        Route::patch('/items/{item}/status', [AdminController::class, 'moderateItem']);
        Route::delete('/items/{item}', [AdminController::class, 'destroyItem']);
        Route::get('/foods', [AdminController::class, 'foods']);
        Route::post('/foods', [AdminController::class, 'storeFood']);
        Route::patch('/foods/{food}', [AdminController::class, 'updateFood']);
        Route::patch('/foods/{food}/status', [AdminController::class, 'moderateFood']);
        Route::delete('/foods/{food}', [AdminController::class, 'destroyFood']);
        Route::get('/organizations', [AdminController::class, 'organizations']);
        Route::get('/organizations/{organization}', [AdminController::class, 'showOrganization']);
        Route::post('/organizations', [AdminController::class, 'storeOrganization']);
        Route::patch('/organizations/{organization}', [AdminController::class, 'updateOrganization']);
        Route::delete('/organizations/{organization}', [AdminController::class, 'destroyOrganization']);
        Route::get('/announcements', [AdminController::class, 'announcements']);
        Route::post('/announcements', [AdminController::class, 'storeAnnouncement']);
        Route::patch('/announcements/{announcement}', [AdminController::class, 'updateAnnouncement']);
        Route::delete('/announcements/{announcement}', [AdminController::class, 'destroyAnnouncement']);
        Route::get('/community', [AdminController::class, 'community']);
        Route::post('/community/events', [AdminController::class, 'storeEvent']);
        Route::patch('/community/events/{event}', [AdminController::class, 'updateEvent']);
        Route::delete('/community/events/{event}', [AdminController::class, 'destroyEvent']);
        Route::get('/community/events/{event}/registrations', [AdminController::class, 'eventRegistrations']);
        Route::post('/community/volunteers', [AdminController::class, 'storeVolunteer']);
        Route::patch('/community/volunteers/{volunteer}', [AdminController::class, 'updateVolunteer']);
        Route::delete('/community/volunteers/{volunteer}', [AdminController::class, 'destroyVolunteer']);
        Route::get('/community/volunteers/{volunteer}/signups', [AdminController::class, 'volunteerSignups']);
        Route::patch('/community/volunteer-signups/{signup}', [AdminController::class, 'updateVolunteerSignup']);
    });

    Route::middleware('role:super_admin')->prefix('admin')->group(function () {
        Route::get('/universities', [AdminController::class, 'universities']);
        Route::post('/universities', [AdminController::class, 'storeUniversity']);
        Route::patch('/universities/{university}', [AdminController::class, 'updateUniversity']);
        Route::delete('/universities/{university}', [AdminController::class, 'destroyUniversity']);
        Route::post('/campus-admins', [AdminController::class, 'createCampusAdmin']);
        Route::get('/campus-admins', [AdminController::class, 'campusAdmins']);
        Route::patch('/campus-admins/{user}', [AdminController::class, 'updateCampusAdmin']);
        Route::post('/campus-admins/{user}/reset-password', [AdminController::class, 'resetCampusAdminPassword']);
        Route::delete('/campus-admins/{user}', [AdminController::class, 'destroyCampusAdmin']);
        Route::get('/categories', [AdminController::class, 'adminCategories']);
        Route::post('/categories', [AdminController::class, 'storeCategory']);
        Route::patch('/categories/{category}', [AdminController::class, 'updateCategory']);
        Route::delete('/categories/{category}', [AdminController::class, 'destroyCategory']);
        Route::get('/ai-settings', [AdminController::class, 'aiSettings']);
        Route::patch('/ai-settings', [AdminController::class, 'updateAiSettings']);
        Route::get('/national-analytics', [AdminController::class, 'nationalAnalytics']);
    });
});
