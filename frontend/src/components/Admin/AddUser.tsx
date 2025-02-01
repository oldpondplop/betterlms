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
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"

import { type UserCreate, UsersService, RolesService, type RolePublic } from "../../client"
import type { ApiError } from "../../client/core/ApiError"
import useCustomToast from "../../hooks/useCustomToast"
import { emailPattern, handleError } from "../../utils"


interface AddUserProps {
  isOpen: boolean
  onClose: () => void
}

interface UserCreateForm extends UserCreate {
  confirm_password: string
}

const AddUser = ({ isOpen, onClose }: AddUserProps) => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()

  const { data: roles, isLoading: loadingRoles } = useQuery<RolePublic[]>({
    queryKey: ["roles"],
    queryFn: () => RolesService.getRoles(),
  })

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      user_id: "",  
      name: "",  
      email: "",
      password: "",
      confirm_password: "",
      is_superuser: false,
      is_active: true,
      role_id: "", 
    },
  })

  const mutation = useMutation({
    mutationFn: (data: UserCreate) =>
      UsersService.createUser({ requestBody: data }),
    onSuccess: () => {
      showToast("Success!", "User created successfully.", "success")
      reset()
      onClose()
    },
    onError: (err: ApiError) => {
      handleError(err, showToast)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const onSubmit: SubmitHandler<UserCreateForm> = (data) => {
    const { confirm_password, ...userData } = data
    mutation.mutate(userData)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Add User</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {/* User ID Field */}
          <FormControl isRequired isInvalid={!!errors.user_id}>
            <FormLabel htmlFor="user_id">User ID</FormLabel>
            <Input
              id="user_id"
              {...register("user_id", { required: "User ID is required" })}
              placeholder="Enter unique User ID"
              type="text"
            />
            {errors.user_id && <FormErrorMessage>{errors.user_id.message}</FormErrorMessage>}
          </FormControl>

          {/* Full Name Field */}
          <FormControl mt={4} isRequired isInvalid={!!errors.name}>
            <FormLabel htmlFor="name">Full Name</FormLabel>
            <Input
              id="name"
              {...register("name", { required: "Full name is required" })}
              placeholder="Full Name"
              type="text"
            />
            {errors.name && <FormErrorMessage>{errors.name.message}</FormErrorMessage>}
          </FormControl>

          {/* Email Field */}
          <FormControl mt={4} isRequired isInvalid={!!errors.email}>
            <FormLabel htmlFor="email">Email</FormLabel>
            <Input
              id="email"
              {...register("email", {
                required: "Email is required",
                pattern: emailPattern,
              })}
              placeholder="Email"
              type="email"
            />
            {errors.email && <FormErrorMessage>{errors.email.message}</FormErrorMessage>}
          </FormControl>

          {/* Password Field */}
          <FormControl mt={4} isRequired isInvalid={!!errors.password}>
            <FormLabel htmlFor="password">Password</FormLabel>
            <Input
              id="password"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "Password must be at least 8 characters" },
              })}
              placeholder="Password"
              type="password"
            />
            {errors.password && <FormErrorMessage>{errors.password.message}</FormErrorMessage>}
          </FormControl>

          {/* Confirm Password Field */}
          <FormControl mt={4} isRequired isInvalid={!!errors.confirm_password}>
            <FormLabel htmlFor="confirm_password">Confirm Password</FormLabel>
            <Input
              id="confirm_password"
              {...register("confirm_password", {
                required: "Please confirm your password",
                validate: (value) => value === getValues().password || "The passwords do not match",
              })}
              placeholder="Confirm Password"
              type="password"
            />
            {errors.confirm_password && <FormErrorMessage>{errors.confirm_password.message}</FormErrorMessage>}
          </FormControl>

          {/* Role Selection Dropdown */}
          <FormControl mt={4} isRequired isInvalid={!!errors.role_id}>
            <FormLabel htmlFor="role_id">Role</FormLabel>
            <Select id="role_id" {...register("role_id", { required: "Role is required" })} isDisabled={loadingRoles}>
              <option value="">Select a Role</option>
              {roles?.map((role: RolePublic) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
            {errors.role_id && <FormErrorMessage>{errors.role_id.message}</FormErrorMessage>}
          </FormControl>

          {/* Is Superuser & Is Active Checkboxes */}
          <Flex mt={4}>
            <FormControl>
              <Checkbox {...register("is_superuser")} colorScheme="teal">
                Is Superuser?
              </Checkbox>
            </FormControl>
            <FormControl>
              <Checkbox {...register("is_active")} colorScheme="teal">
                Is Active?
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

export default AddUser