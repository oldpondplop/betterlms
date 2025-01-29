import {
  Button,
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
  Switch,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"
import {
  type ApiError,
  type UserPublic,
  type UserUpdate,
  UsersService,
  RolesService,
} from "../../client"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"

interface EditUserProps {
  user: UserPublic
  isOpen: boolean
  onClose: () => void
}

const EditUser = ({ user, isOpen, onClose }: EditUserProps) => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors, isDirty },
  } = useForm<UserUpdate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: user.name,
      email: user.email,
      user_id: user.user_id || "",
      is_active: user.is_active,
      is_superuser: user.is_superuser,
      role_id: user.role_id,
    },
  })

  // Fetch roles for role selection
  const { data: rolesResponse } = useQuery({
    queryKey: ["roles"],
    queryFn: () => RolesService.getRoles(),
  })

  const mutation = useMutation({
    mutationFn: (data: UserUpdate) =>
      UsersService.updateUser({ userId: user.id, requestBody: data }),
    onSuccess: () => {
      showToast("Success!", "User updated successfully.", "success")
      onClose()
    },
    onError: (err: ApiError) => {
      handleError(err, showToast)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const onSubmit: SubmitHandler<UserUpdate> = async (data) => {
    mutation.mutate(data)
  }

  const onCancel = () => {
    reset()
    onClose()
  }

  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const isCurrentUser = currentUser?.id === user.id

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "sm", md: "md" }}
      isCentered
    >
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Edit User</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={!!errors.name}>
              <FormLabel htmlFor="name">Full Name</FormLabel>
              <Input
                id="name"
                {...register("name", {
                  required: "Name is required",
                })}
                type="text"
              />
              {errors.name && (
                <FormErrorMessage>{errors.name.message}</FormErrorMessage>
              )}
            </FormControl>

            <FormControl isInvalid={!!errors.email}>
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
                type="email"
              />
              {errors.email && (
                <FormErrorMessage>{errors.email.message}</FormErrorMessage>
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
                type="text"
              />
              {errors.user_id && (
                <FormErrorMessage>{errors.user_id.message}</FormErrorMessage>
              )}
            </FormControl>

            {!isCurrentUser && rolesResponse?.data && (
              <FormControl>
                <FormLabel htmlFor="role_id">Role</FormLabel>
                <Select
                  id="role_id"
                  {...register("role_id")}
                  placeholder="Select role"
                >
                  <option value="">No Role</option>
                  {rolesResponse.data.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                      {role.description && ` - ${role.description}`}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}

            {!isCurrentUser && (
              <>
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="is_active" mb="0">
                    Active Status
                  </FormLabel>
                  <Switch
                    id="is_active"
                    {...register("is_active")}
                  />
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="is_superuser" mb="0">
                    Superuser Status
                  </FormLabel>
                  <Switch
                    id="is_superuser"
                    {...register("is_superuser")}
                    isDisabled={isCurrentUser}
                  />
                </FormControl>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter gap={3}>
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            isDisabled={!isDirty}
          >
            Save
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default EditUser