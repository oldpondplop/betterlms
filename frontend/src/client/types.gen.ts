// This file is auto-generated by @hey-api/openapi-ts

/**
 * Schema for adding a quiz to an existing course.
 */
export type AttachQuizToCourse = {
  course_id: string
  quiz_id: string
}

export type Body_courses_upload_material = {
  file: Blob | File
}

export type Body_login_login_access_token = {
  grant_type?: string | null
  username: string
  password: string
  scope?: string
  client_id?: string | null
  client_secret?: string | null
}

/**
 * Many-to-Many bridging table between Users/Roles and Courses.
 */
export type CourseAssignment = {
  id?: string
  course_id: string
  user_id?: string
  /**
   * Enum representing possible user roles
   */
  role_name: RoleEnum
  assigned_at?: string
}

/**
 * Schema for creating a course with optional assignments and quiz creation.
 */
export type CourseCreate = {
  title: string
  description?: string | null
  materials?: Array<string>
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  assigned_users?: Array<string>
  assigned_roles?: Array<RoleEnum>
  create_quiz?: boolean
}

/**
 * Public response model including assigned users and roles
 */
export type CoursePublic = {
  title: string
  description?: string | null
  materials?: Array<string>
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  id: string
  assigned_users?: Array<string> | null
  assigned_roles?: Array<RoleEnum> | null
}

/**
 * Helper model for returning multiple courses at once along with a `count`.
 */
export type CoursesPublic = {
  data: Array<CoursePublic>
  count: number
}

/**
 * Schema for updating a course
 */
export type CourseUpdate = {
  title?: string | null
  description?: string | null
  materials?: Array<string> | null
  is_active?: boolean | null
  start_date?: string | null
  end_date?: string | null
  assigned_users?: Array<string> | null
  assigned_roles?: Array<RoleEnum> | null
}

export type HTTPValidationError = {
  detail?: Array<ValidationError>
}

/**
 * A generic message model for simple string responses.
 */
export type Message = {
  message: string
}

/**
 * Used for password resets with a token-based workflow.
 */
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
  role?: string
}

/**
 * Enum representing possible user roles.
 */
export type RoleEnum =
  | "admin"
  | "user"
  | "infirmiera"
  | "oficianta"
  | "brancardier"
  | "asistent medical"
  | "femeie de serviciu"
  | "masaj"
  | "kinetoterapie"
  | "receptie"
  | "contabilitate"
  | "informatica"
  | "resurse umane"
  | "epidemiolog"
  | "managementul calitatii"
  | "farmacist"
  | "birou internari/externari"

/**
 * Enum representing possible user roles.
 */
export const RoleEnum = {
  ADMIN: "admin",
  USER: "user",
  INFIRMIERA: "infirmiera",
  OFICIANTA: "oficianta",
  BRANCARDIER: "brancardier",
  ASISTENT_MEDICAL: "asistent medical",
  FEMEIE_DE_SERVICIU: "femeie de serviciu",
  MASAJ: "masaj",
  KINETOTERAPIE: "kinetoterapie",
  RECEPTIE: "receptie",
  CONTABILITATE: "contabilitate",
  INFORMATICA: "informatica",
  RESURSE_UMANE: "resurse umane",
  EPIDEMIOLOG: "epidemiolog",
  MANAGEMENTUL_CALITATII: "managementul calitatii",
  FARMACIST: "farmacist",
  BIROU_INTERNARI_EXTERNARI: "birou internari/externari",
} as const

/**
 * Returned by the auth system on successful login.
 */
export type Token = {
  access_token: string
  token_type?: string
}

/**
 * Model for changing passwords.
 */
export type UpdatePassword = {
  current_password: string
  new_password: string
}

/**
 * Properties used when creating a new user through the API.
 */
export type UserCreate = {
  email: string
  user_id?: string | null
  /**
   * Full Name
   */
  name?: string | null
  /**
   * User role as an enum
   */
  role_name?: RoleEnum
  is_active?: boolean
  is_superuser?: boolean
  password: string
}

/**
 * Properties returned via API when retrieving user info.
 */
export type UserPublic = {
  email: string
  user_id?: string | null
  /**
   * Full Name
   */
  name?: string | null
  /**
   * User role as an enum
   */
  role_name?: RoleEnum
  is_active?: boolean
  is_superuser?: boolean
  id: string
}

/**
 * Properties used for self-registration or public sign-up.
 */
export type UserRegister = {
  email: string
  password: string
  name?: string | null
}

/**
 * Helper model for returning multiple users at once along with a 'count'.
 */
export type UsersPublic = {
  data: Array<UserPublic>
  count: number
}

/**
 * Schema for updating an existing user. All fields optional.
 */
export type UserUpdate = {
  name?: string | null
  email?: string | null
  is_active?: boolean | null
  is_superuser?: boolean | null
  role_name?: RoleEnum | null
}

/**
 * Allows the logged-in user to update their own profile.
 */
export type UserUpdateMe = {
  name?: string | null
  email?: string | null
}

export type ValidationError = {
  loc: Array<string | number>
  msg: string
  type: string
}

export type CoursesUploadMaterialData = {
  formData: Body_courses_upload_material
}

export type CoursesUploadMaterialResponse = string

export type CoursesGetMaterialData = {
  filename: string
}

export type CoursesGetMaterialResponse = unknown

export type CoursesReadCoursesData = {
  limit?: number
  skip?: number
}

export type CoursesReadCoursesResponse = CoursesPublic

export type CoursesCreateCourseData = {
  requestBody: CourseCreate
}

export type CoursesCreateCourseResponse = Message

export type CoursesReadCourseByIdData = {
  courseId: string
}

export type CoursesReadCourseByIdResponse = CoursePublic

export type CoursesUpdateCourseData = {
  courseId: string
  requestBody: CourseUpdate
}

export type CoursesUpdateCourseResponse = CoursePublic

export type CoursesDeleteCourseData = {
  courseId: string
}

export type CoursesDeleteCourseResponse = Message

export type CoursesBulkAssignCourseData = {
  courseId: string
  requestBody: CourseAssignment
}

export type CoursesBulkAssignCourseResponse = Message

export type CoursesAssignUserToCourseData = {
  courseId: string
  userId: string
}

export type CoursesAssignUserToCourseResponse = Message

export type CoursesGetAssignedCoursesForUserData = {
  limit?: number
  skip?: number
  userId: string
}

export type CoursesGetAssignedCoursesForUserResponse = CoursesPublic

export type CoursesGetAssignedUsersForCourseData = {
  courseId: string
}

export type CoursesGetAssignedUsersForCourseResponse = Array<UserPublic>

export type CoursesAttachQuizToCourseData = {
  requestBody: AttachQuizToCourse
}

export type CoursesAttachQuizToCourseResponse = Message

export type CoursesGetCourseDetailsData = {
  courseId: string
}

export type CoursesGetCourseDetailsResponse = CoursePublic

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

export type UsersReadUsersData = {
  limit?: number
  skip?: number
}

export type UsersReadUsersResponse = UsersPublic

export type UsersCreateUserData = {
  requestBody: UserCreate
}

export type UsersCreateUserResponse = UserPublic

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

export type UsersRegisterUserData = {
  requestBody: UserRegister
}

export type UsersRegisterUserResponse = UserPublic

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
