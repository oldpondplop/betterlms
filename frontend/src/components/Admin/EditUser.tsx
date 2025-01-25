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
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"

import {
  type ApiError,
  type UserPublic,
  type UserUpdate,
  UsersService,
} from "../../client"
import useCustomToast from "../../hooks/useCustomToast"
import { emailPattern, handleError } from "../../utils"

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
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UserUpdate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      user_id: user.user_id, 
      name: user.name,
      email: user.email,
      // role: user.role,
      is_superuser: user.is_superuser,
      is_active: user.is_active,
    },
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Edit User</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {/* Editable User ID (admin-defined, not UUID) */}
          <FormControl isRequired isInvalid={!!errors.user_id}>
            <FormLabel htmlFor="user_id">User ID</FormLabel>
            <Input
              id="user_id"
              {...register("user_id", { required: "User ID is required" })}
              placeholder="Enter User ID"
              type="text"
            />
            {errors.user_id && <FormErrorMessage>{errors.user_id.message}</FormErrorMessage>}
          </FormControl>

          {/* Full Name */}
          <FormControl mt={4} isRequired isInvalid={!!errors.name}>
            <FormLabel htmlFor="name">Full Name</FormLabel>
            <Input
              id="name"
              {...register("name", { required: "Full name is required" })}
              type="text"
            />
            {errors.name && <FormErrorMessage>{errors.name.message}</FormErrorMessage>}
          </FormControl>

          {/* Email */}
          <FormControl mt={4} isRequired isInvalid={!!errors.email}>
            <FormLabel htmlFor="email">Email</FormLabel>
            <Input
              id="email"
              {...register("email", {
                required: "Email is required",
                pattern: emailPattern,
              })}
              type="email"
            />
            {errors.email && <FormErrorMessage>{errors.email.message}</FormErrorMessage>}
          </FormControl>

          {/* Checkboxes for Superuser & Active Status */}
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
          <Button variant="primary" type="submit" isLoading={isSubmitting} isDisabled={!isDirty}>
            Save
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default EditUser
