import {
    Button,
    Checkbox,
    Flex,
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
  import { useForm, type SubmitHandler } from "react-hook-form"
  
  import { CoursesService, type CourseCreate, type UsersPublic, RoleEnum, UsersService } from "../../client"
  import type { ApiError } from "../../client/core/ApiError"
  import useCustomToast from "../../hooks/useCustomToast"
  import { handleError } from "../../utils"
  
  interface AddCourseProps {
    isOpen: boolean
    onClose: () => void
  }
  
  const AddCourse = ({ isOpen, onClose }: AddCourseProps) => {
    const queryClient = useQueryClient()
    const showToast = useCustomToast()
  
    const {
      register,
      handleSubmit,
      watch,
      reset,
      formState: { errors, isSubmitting },
    } = useForm<CourseCreate>({
      mode: "onBlur",
      defaultValues: {
        title: "",
        description: "",
        is_active: true,
        start_date: "",
        end_date: "",
        create_quiz: false,
        assigned_users: [],
        assigned_roles: [],
      },
    })
  
    const { data = [] } = useQuery<UsersPublic>({
      queryKey: ["users"],
      queryFn: () => UsersService.readUsers(),
    })
    const users = data?.data || []

    const mutation = useMutation({
      mutationFn: (data: CourseCreate) => CoursesService.createCourse({ requestBody: data }),
      onSuccess: () => {
        showToast("Success!", "Course created successfully.", "success")
        reset()
        queryClient.invalidateQueries({ queryKey: ["courses"] })
        onClose()
      },
      onError: (err: ApiError) => {
        handleError(err, showToast)
      },
    })
  
    const onSubmit: SubmitHandler<CourseCreate> = (data) => {
      mutation.mutate(data)
    }
  
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>Create Course</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {/* Course Title */}
            <FormControl isRequired isInvalid={!!errors.title}>
              <FormLabel htmlFor="title">Title</FormLabel>
              <Input id="title" {...register("title", { required: "Title is required" })} placeholder="Enter course title" type="text" />
              {errors.title && <FormErrorMessage>{errors.title.message}</FormErrorMessage>}
            </FormControl>
  
            {/* Course Description */}
            <FormControl mt={4} isInvalid={!!errors.description}>
              <FormLabel htmlFor="description">Description</FormLabel>
              <Textarea id="description" {...register("description")} placeholder="Enter course description" />
            </FormControl>
  
            {/* Start & End Date */}
            <FormControl mt={4} isRequired isInvalid={!!errors.start_date}>
              <FormLabel htmlFor="start_date">Start Date</FormLabel>
              <Input id="start_date" {...register("start_date", { required: "Start date is required" })} type="date" />
            </FormControl>
  
            <FormControl mt={4} isRequired isInvalid={!!errors.end_date}>
              <FormLabel htmlFor="end_date">End Date</FormLabel>
              <Input id="end_date" {...register("end_date", { required: "End date is required" })} type="date" />
            </FormControl>
  
            {/* Assign Users */}
            <FormControl mt={4}>
              <FormLabel htmlFor="assigned_users">Assign Users</FormLabel>
              <Select multiple {...register("assigned_users")}>
                {users.map(user => (
                  <option key={user.id} value={user.email}>{user.name}</option>
                ))}
              </Select>
            </FormControl>
  
            {/* Assign Roles */}
            <FormControl mt={4}>
              <FormLabel htmlFor="assigned_roles">Assign Roles</FormLabel>
              <Select multiple {...register("assigned_roles")}>
                {Object.values(RoleEnum).map(role => (
                  <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                ))}
              </Select>
            </FormControl>
  
            {/* Active & Create Quiz */}
            <Flex mt={4}>
              <FormControl>
                <Checkbox {...register("is_active")} colorScheme="teal">
                  Is Active?
                </Checkbox>
              </FormControl>
              <FormControl>
                <Checkbox {...register("create_quiz")} colorScheme="teal">
                  Create Quiz?
                </Checkbox>
              </FormControl>
            </Flex>
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
  