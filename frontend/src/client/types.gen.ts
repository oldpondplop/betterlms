// This file is auto-generated by @hey-api/openapi-ts

export type Body_login_login_access_token = {
  grant_type?: string | null
  username: string
  password: string
  scope?: string
  client_id?: string | null
  client_secret?: string | null
}

export type CourseCreate = {
  title: string
  description?: string | null
  materials?: Array<string>
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
}

export type CourseDetailed = {
  title: string
  description?: string | null
  materials?: Array<string>
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  id: string
  roles?: Array<RolePublic>
  users?: Array<UserPublic>
  quiz?: QuizPublic | null
}

export type CoursePublic = {
  title: string
  description?: string | null
  materials?: Array<string>
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  id: string
}

export type CoursesPublic = {
  data: Array<CoursePublic>
  count: number
}

export type CourseUpdate = {
  title?: string | null
  description?: string | null
  materials?: Array<string> | null
  is_active?: boolean | null
  start_date?: string | null
  end_date?: string | null
}

export type HTTPValidationError = {
  detail?: Array<ValidationError>
}

export type Message = {
  message: string
}

export type NewPassword = {
  token: string
  new_password: string
}

export type PrivateUserCreate = {
  email: string
  password: string
  name: string
  is_active?: boolean
  is_superuser?: boolean
}

export type QuizAttemptPublic = {
  score: number
  attempt_number: number
  passed?: boolean
  id: string
  quiz_id: string
  user_id: string
}

export type QuizCreate = {
  max_attempts?: number
  passing_threshold?: number
  questions?: Array<{
    [key: string]: unknown
  }>
  course_id: string
}

export type QuizPublic = {
  max_attempts?: number
  passing_threshold?: number
  questions?: Array<{
    [key: string]: unknown
  }>
  id: string
  course_id: string
}

export type QuizQuestion = {
  question: string
  choices: Array<string>
  correct_index: number
}

export type QuizUpdate = {
  max_attempts?: number | null
  passing_threshold?: number | null
  questions?: Array<QuizQuestion> | null
  course_id?: string | null
}

export type QuizzesPublic = {
  data: Array<QuizPublic>
  count: number
}

export type RoleCreate = {
  name: string
  description?: string | null
}

export type RolePublic = {
  name: string
  description?: string | null
  id: string
}

export type RolesPublic = {
  data: Array<RolePublic>
  count: number
}

export type RoleUpdate = {
  name?: string | null
  description?: string | null
}

export type Token = {
  access_token: string
  token_type?: string
}

export type UpdatePassword = {
  current_password: string
  new_password: string
}

export type UserCreate = {
  name: string
  email: string
  is_active?: boolean
  is_superuser?: boolean
  /**
   * Employee id
   */
  user_id?: string | null
  password: string
  role_id: string | null
}

export type UserPublic = {
  name: string
  email: string
  is_active?: boolean
  is_superuser?: boolean
  /**
   * Employee id
   */
  user_id?: string | null
  id: string
  role_id?: string | null
}

export type UsersPublic = {
  data: Array<UserPublic>
  count: number
}

export type UserUpdate = {
  name?: string | null
  email?: string | null
  user_id?: string | null
  is_active?: boolean | null
  is_superuser?: boolean | null
  role_id?: string | null
}

export type UserUpdateMe = {
  name?: string | null
  email?: string | null
}

export type ValidationError = {
  loc: Array<string | number>
  msg: string
  type: string
}

export type CoursesCreateCourseData = {
  requestBody: CourseCreate
}

export type CoursesCreateCourseResponse = CoursePublic

export type CoursesReadCoursesData = {
  limit?: number
  skip?: number
}

export type CoursesReadCoursesResponse = CoursesPublic

export type CoursesReadCourseData = {
  courseId: string
}

export type CoursesReadCourseResponse = CourseDetailed

export type CoursesUpdateCourseData = {
  courseId: string
  requestBody: CourseUpdate
}

export type CoursesUpdateCourseResponse = CoursePublic

export type CoursesDeleteCourseData = {
  courseId: string
}

export type CoursesDeleteCourseResponse = Message

export type CoursesAssignRoleToCourseData = {
  courseId: string
  roleId: string
}

export type CoursesAssignRoleToCourseResponse = Message

export type CoursesUnassignRoleFromCourseData = {
  courseId: string
  roleId: string
}

export type CoursesUnassignRoleFromCourseResponse = Message

export type CoursesAssignUserToCourseData = {
  courseId: string
  userId: string
}

export type CoursesAssignUserToCourseResponse = Message

export type CoursesUnassignUserFromCourseData = {
  courseId: string
  userId: string
}

export type CoursesUnassignUserFromCourseResponse = Message

export type LoginLoginAccessTokenData = {
  formData: Body_login_login_access_token
}

export type LoginLoginAccessTokenResponse = Token

export type LoginTestTokenResponse = UserPublic

export type LoginRecoverPasswordData = {
  email: string
}

export type LoginRecoverPasswordResponse = Message

export type LoginResetPasswordData = {
  requestBody: NewPassword
}

export type LoginResetPasswordResponse = Message

export type LoginRecoverPasswordHtmlContentData = {
  email: string
}

export type LoginRecoverPasswordHtmlContentResponse = string

export type PrivateCreateUserData = {
  requestBody: PrivateUserCreate
}

export type PrivateCreateUserResponse = UserPublic

export type QuizzesCreateQuizData = {
  requestBody: QuizCreate
}

export type QuizzesCreateQuizResponse = QuizPublic

export type QuizzesReadQuizzesData = {
  limit?: number
  skip?: number
}

export type QuizzesReadQuizzesResponse = QuizzesPublic

export type QuizzesReadQuizData = {
  quizId: string
}

export type QuizzesReadQuizResponse = QuizPublic

export type QuizzesUpdateQuizData = {
  quizId: string
  requestBody: QuizUpdate
}

export type QuizzesUpdateQuizResponse = QuizPublic

export type QuizzesDeleteQuizData = {
  quizId: string
}

export type QuizzesDeleteQuizResponse = Message

export type QuizzesSubmitQuizAttemptData = {
  quizId: string
  requestBody: Array<number>
}

export type QuizzesSubmitQuizAttemptResponse = QuizAttemptPublic

export type QuizzesGetQuizAttemptsData = {
  limit?: number
  quizId: string
  skip?: number
}

export type QuizzesGetQuizAttemptsResponse = Array<QuizAttemptPublic>

export type QuizzesGetQuizStatsData = {
  quizId: string
}

export type QuizzesGetQuizStatsResponse = {
  [key: string]: unknown
}

export type QuizzesGetQuizAnalyticsData = {
  quizId: string
}

export type QuizzesGetQuizAnalyticsResponse = {
  [key: string]: unknown
}

export type QuizzesGetQuizAnalytics1Data = {
  quizId: string
}

export type QuizzesGetQuizAnalytics1Response = QuizPublic

export type QuizzesGetQuestionsAnalysisData = {
  quizId: string
}

export type QuizzesGetQuestionsAnalysisResponse = Array<{
  [key: string]: unknown
}>

export type QuizzesGetCourseQuizProgressData = {
  courseId: string
}

export type QuizzesGetCourseQuizProgressResponse = {
  [key: string]: unknown
}

export type RolesGetRolesResponse = RolesPublic

export type RolesCreateRoleData = {
  requestBody: RoleCreate
}

export type RolesCreateRoleResponse = RolePublic

export type RolesGetRoleData = {
  roleId: string
}

export type RolesGetRoleResponse = RolePublic

export type RolesUpdateRoleData = {
  requestBody: RoleUpdate
  roleId: string
}

export type RolesUpdateRoleResponse = RolePublic

export type RolesDeleteRoleData = {
  roleId: string
}

export type RolesDeleteRoleResponse = Message

export type RolesGetUsersByRoleData = {
  limit?: number
  roleId: string
  skip?: number
}

export type RolesGetUsersByRoleResponse = UsersPublic

export type RolesGetCoursesByRoleData = {
  limit?: number
  roleId: string
  skip?: number
}

export type RolesGetCoursesByRoleResponse = CoursesPublic

export type UsersReadUserMeResponse = UserPublic

export type UsersDeleteUserMeResponse = Message

export type UsersUpdateUserMeData = {
  requestBody: UserUpdateMe
}

export type UsersUpdateUserMeResponse = UserPublic

export type UsersUpdatePasswordMeData = {
  requestBody: UpdatePassword
}

export type UsersUpdatePasswordMeResponse = Message

export type UsersGetUsersData = {
  limit?: number
  skip?: number
}

export type UsersGetUsersResponse = UsersPublic

export type UsersCreateUserData = {
  requestBody: UserCreate
}

export type UsersCreateUserResponse = UserPublic

export type UsersReadUserByIdData = {
  userId: string
}

export type UsersReadUserByIdResponse = UserPublic

export type UsersUpdateUserData = {
  requestBody: UserUpdate
  userId: string
}

export type UsersUpdateUserResponse = UserPublic

export type UsersDeleteUserData = {
  userId: string
}

export type UsersDeleteUserResponse = Message
