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

import { type CourseCreate, CoursesService, UsersService, RolesService, type RolePublic, type UserPublic, UsersPublic } from "../../client"
import type { ApiError } from "../../client/core/ApiError"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"

interface AddCourseProps {
  isOpen: boolean
  onClose: () => void
}

const AddCourse = ({ isOpen, onClose }: AddCourseProps): JSX.Element => {
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CourseCreate & { selectedUsers: string[]; selectedRoles: string[] }>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      is_active: true,
      selectedUsers: [],
      selectedRoles: [],
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: CourseCreate & { selectedUsers: string[]; selectedRoles: string[] }) => {
      const newCourse = await CoursesService.createCourse({ requestBody: data })

      // Assign selected users and roles after course creation
      await Promise.all([
        ...data.selectedUsers.map((userId) =>
          CoursesService.assignUser({ courseId: newCourse.id, userId })
        ),
        ...data.selectedRoles.map((roleId) =>
          CoursesService.assignRole({ courseId: newCourse.id, roleId })
        ),
      ])

      return newCourse
    },
    onSuccess: () => {
      showToast("Success!", "Course created successfully.", "success")
      reset()
      onClose()
      queryClient.invalidateQueries({ queryKey: ["courses"] }) // Refresh courses list
    },
    onError: (err: ApiError) => {
      handleError(err, showToast)
    },
  })

  const onSubmit: SubmitHandler<CourseCreate & { selectedUsers: string[]; selectedRoles: string[] }> = (data) => {
    mutation.mutate(data)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Add Course</ModalHeader>
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
            <Select multiple id="users" {...register("selectedUsers")} isDisabled={loadingUsers}>
              {users?.data.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </FormControl>

          {/* Assign Roles */}
          <FormControl mt={4}>
            <FormLabel htmlFor="roles">Assign Roles</FormLabel>
            <Select multiple id="roles" {...register("selectedRoles")} isDisabled={loadingRoles}>
              {roles?.map((role) => (
                <option key={role.id} value={role.id}>
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
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            Save
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default AddCourse
