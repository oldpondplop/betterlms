import {
  Button,
  FormControl,
  FormErrorMessage,
  FormHelperText,
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
  Switch,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"
import { type ApiError, type UserCreate, UsersService } from "../../client"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"

interface AddUserProps {
  isOpen: boolean
  onClose: () => void
}

const AddUser = ({ isOpen, onClose }: AddUserProps) => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      user_id: "",
      is_active: true,
      is_superuser: false,
      role_id: null,
    },
  })

  // Fetch roles for role selection
  const { data: rolesResponse } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await fetch("/api/roles")
      if (!response.ok) {
        throw new Error("Failed to fetch roles")
      }
      return response.json() as Promise<{ data: Array<{ id: string; name: string; description: string | null }> }>
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

  const onSubmit: SubmitHandler<UserCreate> = (data) => {
    mutation.mutate(data)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "sm", md: "md" }}
      isCentered
    >
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Add User</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired isInvalid={!!errors.name}>
              <FormLabel htmlFor="name">Full Name</FormLabel>
              <Input
                id="name"
                {...register("name", {
                  required: "Name is required",
                })}
                placeholder="Full Name"
                type="text"
              />
              {errors.name && (
                <FormErrorMessage>{errors.name.message}</FormErrorMessage>
              )}
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.email}>
              <FormLabel htmlFor="email">Email</FormLabel>
              <Input
                id="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                placeholder="Email"
                type="email"
              />
              {errors.email && (
                <FormErrorMessage>{errors.email.message}</FormErrorMessage>
              )}
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.password}>
              <FormLabel htmlFor="password">Password</FormLabel>
              <Input
                id="password"
                {...register("password", {
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                  maxLength: {
                    value: 40,
                    message: "Password cannot exceed 40 characters",
                  },
                })}
                placeholder="Password"
                type="password"
              />
              {errors.password && (
                <FormErrorMessage>{errors.password.message}</FormErrorMessage>
              )}
            </FormControl>

            <FormControl>
              <FormLabel htmlFor="user_id">Employee ID</FormLabel>
              <Input
                id="user_id"
                {...register("user_id", {
                  maxLength: {
                    value: 30,
                    message: "Employee ID cannot exceed 30 characters",
                  },
                })}
                placeholder="Employee ID"
                type="text"
              />
              {errors.user_id && (
                <FormErrorMessage>{errors.user_id.message}</FormErrorMessage>
              )}
            </FormControl>

            {rolesResponse?.data && (
              <FormControl>
                <FormLabel htmlFor="role_id">Role</FormLabel>
                <Select
                  id="role_id"
                  {...register("role_id")}
                  placeholder="Select role"
                >
                  {rolesResponse.data.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                      {role.description && ` - ${role.description}`}
                    </option>
                  ))}
                </Select>
                <FormHelperText>
                  Select a role to define user permissions
                </FormHelperText>
              </FormControl>
            )}

            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="is_active" mb="0">
                Active Status
              </FormLabel>
              <Switch
                id="is_active"
                {...register("is_active")}
                defaultChecked
              />
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="is_superuser" mb="0">
                Superuser Status
              </FormLabel>
              <Switch
                id="is_superuser"
                {...register("is_superuser")}
              />
            </FormControl>
          </VStack>
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