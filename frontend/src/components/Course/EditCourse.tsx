import {
    Button,
    Checkbox,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Select,
    Textarea,
  } from "@chakra-ui/react"
  import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
  import { type SubmitHandler, useForm } from "react-hook-form"
  
  import {
    type CoursePublic,
    type CourseUpdate,
    CoursesService,
    UsersService,
    RolesService,
    type RolePublic,
    type UserPublic,
    UsersPublic,
    RolesPublic,
  } from "../../client"
  import type { ApiError } from "../../client/core/ApiError"
  import useCustomToast from "../../hooks/useCustomToast"
  import { handleError } from "../../utils"
  
  interface EditCourseProps {
    course: CoursePublic
    isOpen: boolean
    onClose: () => void
  }
  
  const EditCourse = ({ course, isOpen, onClose }: EditCourseProps): JSX.Element => {
    const queryClient = useQueryClient()
    const showToast = useCustomToast()
  
    // Fetch users and roles
    const { data: users, isLoading: loadingUsers } = useQuery<{ data: UserPublic[]; count: number }>({
        queryKey: ["users"],
        queryFn: () => UsersService.getUsers({ skip: 0, limit: 100 }),
    })

    const { data: roles, isLoading: loadingRoles } = useQuery<RolePublic[]>({
        queryKey: ["roles"],
        queryFn: () => RolesService.getRoles(),
    })

    // Fetch currently assigned users and roles
    const { data: assignedUsers } = useQuery<UsersPublic>({
      queryKey: ["courseUsers", course.id],
      queryFn: () => CoursesService.getCourseUsers({ courseId: course.id }),
    })
  
    const { data: assignedRoles } = useQuery<RolesPublic>({
      queryKey: ["courseRoles", course.id],
      queryFn: () => CoursesService.getCourseRoles({ courseId: course.id }),
    })
  
    const {
      register,
      handleSubmit,
      setValue,
      watch,
      formState: { errors, isSubmitting, isDirty },
    } = useForm<CourseUpdate & { selectedUsers: string[]; selectedRoles: string[] }>({
      mode: "onBlur",
      criteriaMode: "all",
      defaultValues: {
        title: course.title,
        description: course.description || "",
        start_date: course.start_date || "",
        end_date: course.end_date || "",
        is_active: course.is_active,
        selectedUsers: assignedUsers?.data.map((user) => user.id) || [],
        selectedRoles: assignedRoles?.data.map((role) => role.id) || [],
      },
    })
  
    // Track selected users and roles
    const selectedUsers = watch("selectedUsers")
    const selectedRoles = watch("selectedRoles")
  
    const mutation = useMutation({
      mutationFn: async (data: CourseUpdate & { selectedUsers: string[]; selectedRoles: string[] }) => {
        await CoursesService.updateCourse({ courseId: course.id, requestBody: data })
  
        // Remove users not selected
        const usersToRemove = assignedUsers
          ?.data.filter((user) => !data.selectedUsers.includes(user.id))
          .map((user) => user.id) || []
        await Promise.all(usersToRemove.map((userId) => CoursesService.unassignUser({ courseId: course.id, userId })))
  
        // Add new users
        const usersToAdd = data.selectedUsers.filter((userId) => !assignedUsers?.data.some((user) => user.id === userId))
        await Promise.all(usersToAdd.map((userId) => CoursesService.assignUser({ courseId: course.id, userId })))
  
        // Remove roles not selected
        const rolesToRemove = assignedRoles
          ?.data.filter((role) => !data.selectedRoles.includes(role.id))
          .map((role) => role.id) || []
        await Promise.all(rolesToRemove.map((roleId) => CoursesService.unassignRole({ courseId: course.id, roleId })))
  
        // Add new roles
        const rolesToAdd = data.selectedRoles.filter((roleId) => !assignedRoles?.data.some((role) => role.id === roleId))
        await Promise.all(rolesToAdd.map((roleId) => CoursesService.assignRole({ courseId: course.id, roleId })))
  
        return data
      },
      onSuccess: () => {
        showToast("Success!", "Course updated successfully.", "success")
        onClose()
        queryClient.invalidateQueries({ queryKey: ["courses"] }) // Refresh courses list
      },
      onError: (err: ApiError) => {
        handleError(err, showToast)
      },
    })
  
    const onSubmit: SubmitHandler<CourseUpdate & { selectedUsers: string[]; selectedRoles: string[] }> = async (data) => {
      mutation.mutate(data)
    }
  
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>Edit Course</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {/* Course Title */}
            <FormControl isRequired isInvalid={!!errors.title}>
              <FormLabel htmlFor="title">Course Title</FormLabel>
              <Input id="title" {...register("title", { required: "Course title is required" })} type="text" />
              {errors.title && <FormErrorMessage>{errors.title.message}</FormErrorMessage>}
            </FormControl>
  
            {/* Description */}
            <FormControl mt={4} isInvalid={!!errors.description}>
              <FormLabel htmlFor="description">Description</FormLabel>
              <Textarea id="description" {...register("description")} />
            </FormControl>
  
            {/* Start Date */}
            <FormControl mt={4}>
              <FormLabel htmlFor="start_date">Start Date</FormLabel>
              <Input id="start_date" {...register("start_date")} type="date" />
            </FormControl>
  
            {/* End Date */}
            <FormControl mt={4}>
              <FormLabel htmlFor="end_date">End Date</FormLabel>
              <Input id="end_date" {...register("end_date")} type="date" />
            </FormControl>
  
            {/* Assign Users */}
            <FormControl mt={4}>
              <FormLabel htmlFor="users">Assign Users</FormLabel>
              <Select
                multiple
                id="users"
                {...register("selectedUsers")}
                onChange={(e) => setValue("selectedUsers", [...e.target.selectedOptions].map((o) => o.value))}
                isDisabled={loadingUsers}
              >
                {users?.data.map((user) => (
                  <option key={user.id} value={user.id} selected={selectedUsers.includes(user.id)}>
                    {user.name} 
                  </option>
                ))}
              </Select>
            </FormControl>
  
            {/* Assign Roles */}
            <FormControl mt={4}>
              <FormLabel htmlFor="roles">Assign Roles</FormLabel>
              <Select
                multiple
                id="roles"
                {...register("selectedRoles")}
                onChange={(e) => setValue("selectedRoles", [...e.target.selectedOptions].map((o) => o.value))}
                isDisabled={loadingRoles}
              >
                {roles?.map((role) => (
                  <option key={role.id} value={role.id} selected={selectedRoles.includes(role.id)}>
                    {role.name}
                  </option>
                ))}
              </Select>
            </FormControl>
  
            {/* Active Checkbox */}
            <FormControl mt={4}>
              <Checkbox {...register("is_active")} colorScheme="teal">
                Course is Active
              </Checkbox>
            </FormControl>
          </ModalBody>
  
          <ModalFooter gap={3}>
            <Button variant="primary" type="submit" isLoading={isSubmitting} isDisabled={!isDirty}>
              Save
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )
  }
  
  export default EditCourse
  