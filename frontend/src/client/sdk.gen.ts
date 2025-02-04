// This file is auto-generated by @hey-api/openapi-ts

import type { CancelablePromise } from "./core/CancelablePromise"
import { OpenAPI } from "./core/OpenAPI"
import { request as __request } from "./core/request"
import type {
  CoursesGetUserCoursesResponse,
  CoursesCreateCourseData,
  CoursesCreateCourseResponse,
  CoursesReadCoursesData,
  CoursesReadCoursesResponse,
  CoursesReadCourseData,
  CoursesReadCourseResponse,
  CoursesUpdateCourseData,
  CoursesUpdateCourseResponse,
  CoursesDeleteCourseData,
  CoursesDeleteCourseResponse,
  CoursesAssignRoleToCourseData,
  CoursesAssignRoleToCourseResponse,
  CoursesUnassignRoleFromCourseData,
  CoursesUnassignRoleFromCourseResponse,
  CoursesAssignUserToCourseData,
  CoursesAssignUserToCourseResponse,
  CoursesUnassignUserFromCourseData,
  CoursesUnassignUserFromCourseResponse,
  CoursesUploadMaterialsData,
  CoursesUploadMaterialsResponse,
  CoursesUpdateMaterialsData,
  CoursesUpdateMaterialsResponse,
  CoursesListMaterialsData,
  CoursesListMaterialsResponse,
  CoursesDownloadMaterialData,
  CoursesDownloadMaterialResponse,
  CoursesDeleteMaterialData,
  CoursesDeleteMaterialResponse,
  LoginLoginAccessTokenData,
  LoginLoginAccessTokenResponse,
  LoginTestTokenResponse,
  LoginRecoverPasswordData,
  LoginRecoverPasswordResponse,
  LoginResetPasswordData,
  LoginResetPasswordResponse,
  LoginRecoverPasswordHtmlContentData,
  LoginRecoverPasswordHtmlContentResponse,
  PrivateCreateUserData,
  PrivateCreateUserResponse,
  QuizzesCreateQuizData,
  QuizzesCreateQuizResponse,
  QuizzesReadQuizzesData,
  QuizzesReadQuizzesResponse,
  QuizzesReadQuizData,
  QuizzesReadQuizResponse,
  QuizzesUpdateQuizData,
  QuizzesUpdateQuizResponse,
  QuizzesDeleteQuizData,
  QuizzesDeleteQuizResponse,
  QuizzesSubmitQuizAttemptData,
  QuizzesSubmitQuizAttemptResponse,
  QuizzesGetQuizAttemptsData,
  QuizzesGetQuizAttemptsResponse,
  QuizzesGetQuizStatsData,
  QuizzesGetQuizStatsResponse,
  QuizzesGetQuizAnalyticsData,
  QuizzesGetQuizAnalyticsResponse,
  QuizzesGetQuizAnalytics1Data,
  QuizzesGetQuizAnalytics1Response,
  QuizzesGetQuestionsAnalysisData,
  QuizzesGetQuestionsAnalysisResponse,
  QuizzesGetCourseQuizProgressData,
  QuizzesGetCourseQuizProgressResponse,
  RolesGetRolesResponse,
  RolesCreateRoleData,
  RolesCreateRoleResponse,
  RolesGetRoleData,
  RolesGetRoleResponse,
  RolesUpdateRoleData,
  RolesUpdateRoleResponse,
  RolesDeleteRoleData,
  RolesDeleteRoleResponse,
  RolesGetUsersByRoleData,
  RolesGetUsersByRoleResponse,
  RolesGetCoursesByRoleData,
  RolesGetCoursesByRoleResponse,
  UsersReadUserMeResponse,
  UsersDeleteUserMeResponse,
  UsersUpdateUserMeData,
  UsersUpdateUserMeResponse,
  UsersUpdatePasswordMeData,
  UsersUpdatePasswordMeResponse,
  UsersGetUsersData,
  UsersGetUsersResponse,
  UsersCreateUserData,
  UsersCreateUserResponse,
  UsersReadUserByIdData,
  UsersReadUserByIdResponse,
  UsersUpdateUserData,
  UsersUpdateUserResponse,
  UsersDeleteUserData,
  UsersDeleteUserResponse,
} from "./types.gen"

export class CoursesService {
  /**
   * Get User Courses
   * @returns CourseDetailed Successful Response
   * @throws ApiError
   */
  public static getUserCourses(): CancelablePromise<CoursesGetUserCoursesResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/courses/me/courses",
    })
  }

  /**
   * Create Course
   * Create a new course. Only accessible by superusers.
   * @param data The data for the request.
   * @param data.requestBody
   * @returns CoursePublic Successful Response
   * @throws ApiError
   */
  public static createCourse(
    data: CoursesCreateCourseData,
  ): CancelablePromise<CoursesCreateCourseResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/courses/",
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Read Courses
   * Retrieve all courses with pagination.
   * @param data The data for the request.
   * @param data.skip
   * @param data.limit
   * @returns CoursesPublic Successful Response
   * @throws ApiError
   */
  public static readCourses(
    data: CoursesReadCoursesData = {},
  ): CancelablePromise<CoursesReadCoursesResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/courses/",
      query: {
        skip: data.skip,
        limit: data.limit,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Read Course
   * Retrieve a course by its ID. Accessible by any authenticated user.
   * @param data The data for the request.
   * @param data.courseId
   * @returns CourseDetailed Successful Response
   * @throws ApiError
   */
  public static readCourse(
    data: CoursesReadCourseData,
  ): CancelablePromise<CoursesReadCourseResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/courses/{course_id}",
      path: {
        course_id: data.courseId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Update Course
   * Update a course by its ID. Only accessible by superusers.
   * @param data The data for the request.
   * @param data.courseId
   * @param data.requestBody
   * @returns CoursePublic Successful Response
   * @throws ApiError
   */
  public static updateCourse(
    data: CoursesUpdateCourseData,
  ): CancelablePromise<CoursesUpdateCourseResponse> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/api/v1/courses/{course_id}",
      path: {
        course_id: data.courseId,
      },
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Delete Course
   * Delete a course and all its related data.
   * @param data The data for the request.
   * @param data.courseId
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static deleteCourse(
    data: CoursesDeleteCourseData,
  ): CancelablePromise<CoursesDeleteCourseResponse> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/courses/{course_id}",
      path: {
        course_id: data.courseId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Assign Role To Course
   * Assign a role to a course. Only accessible by superusers.
   * @param data The data for the request.
   * @param data.courseId
   * @param data.roleId
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static assignRoleToCourse(
    data: CoursesAssignRoleToCourseData,
  ): CancelablePromise<CoursesAssignRoleToCourseResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/courses/{course_id}/assign-role/{role_id}",
      path: {
        course_id: data.courseId,
        role_id: data.roleId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Unassign Role From Course
   * @param data The data for the request.
   * @param data.courseId
   * @param data.roleId
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static unassignRoleFromCourse(
    data: CoursesUnassignRoleFromCourseData,
  ): CancelablePromise<CoursesUnassignRoleFromCourseResponse> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/courses/{course_id}/remove-role/{role_id}",
      path: {
        course_id: data.courseId,
        role_id: data.roleId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Assign User To Course
   * Assign a user to a course. Only accessible by superusers.
   * @param data The data for the request.
   * @param data.courseId
   * @param data.userId
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static assignUserToCourse(
    data: CoursesAssignUserToCourseData,
  ): CancelablePromise<CoursesAssignUserToCourseResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/courses/{course_id}/assign-user/{user_id}",
      path: {
        course_id: data.courseId,
        user_id: data.userId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Unassign User From Course
   * @param data The data for the request.
   * @param data.courseId
   * @param data.userId
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static unassignUserFromCourse(
    data: CoursesUnassignUserFromCourseData,
  ): CancelablePromise<CoursesUnassignUserFromCourseResponse> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/courses/{course_id}/remove-user/{user_id}",
      path: {
        course_id: data.courseId,
        user_id: data.userId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Upload Materials
   * Upload multiple files and attach them to a course.
   * @param data The data for the request.
   * @param data.courseId
   * @param data.formData
   * @returns CoursePublic Successful Response
   * @throws ApiError
   */
  public static uploadMaterials(
    data: CoursesUploadMaterialsData,
  ): CancelablePromise<CoursesUploadMaterialsResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/courses/{course_id}/materials/",
      path: {
        course_id: data.courseId,
      },
      formData: data.formData,
      mediaType: "multipart/form-data",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Update Materials
   * @param data The data for the request.
   * @param data.courseId
   * @param data.formData
   * @returns CourseMaterialPublic Successful Response
   * @throws ApiError
   */
  public static updateMaterials(
    data: CoursesUpdateMaterialsData,
  ): CancelablePromise<CoursesUpdateMaterialsResponse> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/api/v1/courses/{course_id}/materials/",
      path: {
        course_id: data.courseId,
      },
      formData: data.formData,
      mediaType: "multipart/form-data",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * List Materials
   * List all materials for a course.
   * @param data The data for the request.
   * @param data.courseId
   * @returns string Successful Response
   * @throws ApiError
   */
  public static listMaterials(
    data: CoursesListMaterialsData,
  ): CancelablePromise<CoursesListMaterialsResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/courses/{course_id}/materials/",
      path: {
        course_id: data.courseId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Download Material
   * Download or view a material.
   * @param data The data for the request.
   * @param data.filename
   * @returns unknown Successful Response
   * @throws ApiError
   */
  public static downloadMaterial(
    data: CoursesDownloadMaterialData,
  ): CancelablePromise<CoursesDownloadMaterialResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/courses/materials/{filename}",
      path: {
        filename: data.filename,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Delete Material
   * @param data The data for the request.
   * @param data.courseId
   * @param data.filename
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static deleteMaterial(
    data: CoursesDeleteMaterialData,
  ): CancelablePromise<CoursesDeleteMaterialResponse> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/courses/{course_id}/materials/{filename}",
      path: {
        course_id: data.courseId,
        filename: data.filename,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }
}

export class LoginService {
  /**
   * Login Access Token
   * OAuth2 compatible token login, get an access token for future requests
   * @param data The data for the request.
   * @param data.formData
   * @returns Token Successful Response
   * @throws ApiError
   */
  public static loginAccessToken(
    data: LoginLoginAccessTokenData,
  ): CancelablePromise<LoginLoginAccessTokenResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/login/access-token",
      formData: data.formData,
      mediaType: "application/x-www-form-urlencoded",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Test Token
   * Test access token
   * @returns UserPublic Successful Response
   * @throws ApiError
   */
  public static testToken(): CancelablePromise<LoginTestTokenResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/login/test-token",
    })
  }

  /**
   * Recover Password
   * Password Recovery
   * @param data The data for the request.
   * @param data.email
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static recoverPassword(
    data: LoginRecoverPasswordData,
  ): CancelablePromise<LoginRecoverPasswordResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/password-recovery/{email}",
      path: {
        email: data.email,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Reset Password
   * Reset password
   * @param data The data for the request.
   * @param data.requestBody
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static resetPassword(
    data: LoginResetPasswordData,
  ): CancelablePromise<LoginResetPasswordResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/reset-password/",
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Recover Password Html Content
   * HTML Content for Password Recovery
   * @param data The data for the request.
   * @param data.email
   * @returns string Successful Response
   * @throws ApiError
   */
  public static recoverPasswordHtmlContent(
    data: LoginRecoverPasswordHtmlContentData,
  ): CancelablePromise<LoginRecoverPasswordHtmlContentResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/password-recovery-html-content/{email}",
      path: {
        email: data.email,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }
}

export class PrivateService {
  /**
   * Create User
   * Create a new user.
   * @param data The data for the request.
   * @param data.requestBody
   * @returns UserPublic Successful Response
   * @throws ApiError
   */
  public static createUser(
    data: PrivateCreateUserData,
  ): CancelablePromise<PrivateCreateUserResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/private/users/",
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }
}

export class QuizzesService {
  /**
   * Create Quiz
   * Create a new quiz. Only accessible by superusers.
   * @param data The data for the request.
   * @param data.requestBody
   * @returns QuizPublic Successful Response
   * @throws ApiError
   */
  public static createQuiz(
    data: QuizzesCreateQuizData,
  ): CancelablePromise<QuizzesCreateQuizResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/quizzes/",
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Read Quizzes
   * Get all quizzes with pagination.
   * @param data The data for the request.
   * @param data.skip
   * @param data.limit
   * @returns QuizzesPublic Successful Response
   * @throws ApiError
   */
  public static readQuizzes(
    data: QuizzesReadQuizzesData = {},
  ): CancelablePromise<QuizzesReadQuizzesResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/quizzes/",
      query: {
        skip: data.skip,
        limit: data.limit,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Read Quiz
   * Get quiz details.
   * @param data The data for the request.
   * @param data.quizId
   * @returns QuizPublic Successful Response
   * @throws ApiError
   */
  public static readQuiz(
    data: QuizzesReadQuizData,
  ): CancelablePromise<QuizzesReadQuizResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/quizzes/{quiz_id}",
      path: {
        quiz_id: data.quizId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Update Quiz
   * @param data The data for the request.
   * @param data.quizId
   * @param data.requestBody
   * @returns QuizPublic Successful Response
   * @throws ApiError
   */
  public static updateQuiz(
    data: QuizzesUpdateQuizData,
  ): CancelablePromise<QuizzesUpdateQuizResponse> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/api/v1/quizzes/{quiz_id}",
      path: {
        quiz_id: data.quizId,
      },
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Delete Quiz
   * Delete a quiz. Only accessible by superusers.
   * @param data The data for the request.
   * @param data.quizId
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static deleteQuiz(
    data: QuizzesDeleteQuizData,
  ): CancelablePromise<QuizzesDeleteQuizResponse> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/quizzes/{quiz_id}",
      path: {
        quiz_id: data.quizId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Submit Quiz Attempt
   * Submit a quiz attempt.
   * @param data The data for the request.
   * @param data.quizId
   * @param data.requestBody
   * @returns QuizAttemptPublic Successful Response
   * @throws ApiError
   */
  public static submitQuizAttempt(
    data: QuizzesSubmitQuizAttemptData,
  ): CancelablePromise<QuizzesSubmitQuizAttemptResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/quizzes/{quiz_id}/attempt",
      path: {
        quiz_id: data.quizId,
      },
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Get Quiz Attempts
   * Get all attempts for a quiz by the current user.
   * @param data The data for the request.
   * @param data.quizId
   * @param data.skip
   * @param data.limit
   * @returns QuizAttemptPublic Successful Response
   * @throws ApiError
   */
  public static getQuizAttempts(
    data: QuizzesGetQuizAttemptsData,
  ): CancelablePromise<QuizzesGetQuizAttemptsResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/quizzes/{quiz_id}/attempts",
      path: {
        quiz_id: data.quizId,
      },
      query: {
        skip: data.skip,
        limit: data.limit,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Get Quiz Stats
   * Get quiz statistics for the current user.
   * @param data The data for the request.
   * @param data.quizId
   * @returns unknown Successful Response
   * @throws ApiError
   */
  public static getQuizStats(
    data: QuizzesGetQuizStatsData,
  ): CancelablePromise<QuizzesGetQuizStatsResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/quizzes/{quiz_id}/stats",
      path: {
        quiz_id: data.quizId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Get Quiz Analytics
   * Get comprehensive analytics for a quiz. Admin only.
   * @param data The data for the request.
   * @param data.quizId
   * @returns unknown Successful Response
   * @throws ApiError
   */
  public static getQuizAnalytics(
    data: QuizzesGetQuizAnalyticsData,
  ): CancelablePromise<QuizzesGetQuizAnalyticsResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/quizzes/{quiz_id}/analytics",
      path: {
        quiz_id: data.quizId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Get Quiz Analytics
   * Get comprehensive analytics for a quiz. Admin only.
   * @param data The data for the request.
   * @param data.quizId
   * @returns QuizPublic Successful Response
   * @throws ApiError
   */
  public static getQuizAnalytics1(
    data: QuizzesGetQuizAnalytics1Data,
  ): CancelablePromise<QuizzesGetQuizAnalytics1Response> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/quizzes/course/{course_id}",
      query: {
        quiz_id: data.quizId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Get Questions Analysis
   * Get analysis for each question in the quiz. Admin only.
   * @param data The data for the request.
   * @param data.quizId
   * @returns unknown Successful Response
   * @throws ApiError
   */
  public static getQuestionsAnalysis(
    data: QuizzesGetQuestionsAnalysisData,
  ): CancelablePromise<QuizzesGetQuestionsAnalysisResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/quizzes/{quiz_id}/questions/analysis",
      path: {
        quiz_id: data.quizId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Get Course Quiz Progress
   * Get quiz progress statistics for a course. Admin only.
   * @param data The data for the request.
   * @param data.courseId
   * @returns unknown Successful Response
   * @throws ApiError
   */
  public static getCourseQuizProgress(
    data: QuizzesGetCourseQuizProgressData,
  ): CancelablePromise<QuizzesGetCourseQuizProgressResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/quizzes/course/{course_id}/progress",
      path: {
        course_id: data.courseId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }
}

export class RolesService {
  /**
   * Get Roles
   * @returns RolesPublic Successful Response
   * @throws ApiError
   */
  public static getRoles(): CancelablePromise<RolesGetRolesResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/roles/",
    })
  }

  /**
   * Create Role
   * @param data The data for the request.
   * @param data.requestBody
   * @returns RolePublic Successful Response
   * @throws ApiError
   */
  public static createRole(
    data: RolesCreateRoleData,
  ): CancelablePromise<RolesCreateRoleResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/roles/",
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Get Role
   * @param data The data for the request.
   * @param data.roleId
   * @returns RolePublic Successful Response
   * @throws ApiError
   */
  public static getRole(
    data: RolesGetRoleData,
  ): CancelablePromise<RolesGetRoleResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/roles/{role_id}",
      path: {
        role_id: data.roleId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Update Role
   * @param data The data for the request.
   * @param data.roleId
   * @param data.requestBody
   * @returns RolePublic Successful Response
   * @throws ApiError
   */
  public static updateRole(
    data: RolesUpdateRoleData,
  ): CancelablePromise<RolesUpdateRoleResponse> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/api/v1/roles/{role_id}",
      path: {
        role_id: data.roleId,
      },
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Delete Role
   * @param data The data for the request.
   * @param data.roleId
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static deleteRole(
    data: RolesDeleteRoleData,
  ): CancelablePromise<RolesDeleteRoleResponse> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/roles/{role_id}",
      path: {
        role_id: data.roleId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Get Users By Role
   * @param data The data for the request.
   * @param data.roleId
   * @param data.skip
   * @param data.limit
   * @returns UsersPublic Successful Response
   * @throws ApiError
   */
  public static getUsersByRole(
    data: RolesGetUsersByRoleData,
  ): CancelablePromise<RolesGetUsersByRoleResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/roles/{role_id}/users",
      path: {
        role_id: data.roleId,
      },
      query: {
        skip: data.skip,
        limit: data.limit,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Get Courses By Role
   * @param data The data for the request.
   * @param data.roleId
   * @param data.skip
   * @param data.limit
   * @returns CoursesPublic Successful Response
   * @throws ApiError
   */
  public static getCoursesByRole(
    data: RolesGetCoursesByRoleData,
  ): CancelablePromise<RolesGetCoursesByRoleResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/roles/{role_id}/courses",
      path: {
        role_id: data.roleId,
      },
      query: {
        skip: data.skip,
        limit: data.limit,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }
}

export class UsersService {
  /**
   * Read User Me
   * @returns UserPublic Successful Response
   * @throws ApiError
   */
  public static readUserMe(): CancelablePromise<UsersReadUserMeResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/users/me",
    })
  }

  /**
   * Delete User Me
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static deleteUserMe(): CancelablePromise<UsersDeleteUserMeResponse> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/users/me",
    })
  }

  /**
   * Update User Me
   * @param data The data for the request.
   * @param data.requestBody
   * @returns UserPublic Successful Response
   * @throws ApiError
   */
  public static updateUserMe(
    data: UsersUpdateUserMeData,
  ): CancelablePromise<UsersUpdateUserMeResponse> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/api/v1/users/me",
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Update Password Me
   * @param data The data for the request.
   * @param data.requestBody
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static updatePasswordMe(
    data: UsersUpdatePasswordMeData,
  ): CancelablePromise<UsersUpdatePasswordMeResponse> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/api/v1/users/me/password",
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Get Users
   * @param data The data for the request.
   * @param data.skip
   * @param data.limit
   * @returns UsersPublic Successful Response
   * @throws ApiError
   */
  public static getUsers(
    data: UsersGetUsersData = {},
  ): CancelablePromise<UsersGetUsersResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/users/",
      query: {
        skip: data.skip,
        limit: data.limit,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Create User
   * @param data The data for the request.
   * @param data.requestBody
   * @returns UserPublic Successful Response
   * @throws ApiError
   */
  public static createUser(
    data: UsersCreateUserData,
  ): CancelablePromise<UsersCreateUserResponse> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/api/v1/users/",
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Read User By Id
   * @param data The data for the request.
   * @param data.userId
   * @returns UserPublic Successful Response
   * @throws ApiError
   */
  public static readUserById(
    data: UsersReadUserByIdData,
  ): CancelablePromise<UsersReadUserByIdResponse> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/api/v1/users/{user_id}",
      path: {
        user_id: data.userId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Update User
   * @param data The data for the request.
   * @param data.userId
   * @param data.requestBody
   * @returns UserPublic Successful Response
   * @throws ApiError
   */
  public static updateUser(
    data: UsersUpdateUserData,
  ): CancelablePromise<UsersUpdateUserResponse> {
    return __request(OpenAPI, {
      method: "PATCH",
      url: "/api/v1/users/{user_id}",
      path: {
        user_id: data.userId,
      },
      body: data.requestBody,
      mediaType: "application/json",
      errors: {
        422: "Validation Error",
      },
    })
  }

  /**
   * Delete User
   * @param data The data for the request.
   * @param data.userId
   * @returns Message Successful Response
   * @throws ApiError
   */
  public static deleteUser(
    data: UsersDeleteUserData,
  ): CancelablePromise<UsersDeleteUserResponse> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/api/v1/users/{user_id}",
      path: {
        user_id: data.userId,
      },
      errors: {
        422: "Validation Error",
      },
    })
  }
}
