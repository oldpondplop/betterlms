import {
    Button,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Select,
    VStack,
  } from "@chakra-ui/react"
  import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
  import { type SubmitHandler, useForm } from "react-hook-form"
  import { type ApiError, UsersService, RolesService } from "../../client"
  import useCustomToast from "../../hooks/useCustomToast"
  import { handleError } from "../../utils"
import React from "react"
  
  interface AssignRoleProps {
    isOpen: boolean
    onClose: () => void
    userId: string
  }
  
  interface AssignRoleForm {
    role_id: string | null
  }
  
  const AssignRole = ({ isOpen, onClose, userId }: AssignRoleProps) => {
    const queryClient = useQueryClient()
    const showToast = useCustomToast()
  
    const {
      register,
      handleSubmit,
      reset,
      formState: { errors, isSubmitting },
    } = useForm<AssignRoleForm>({
      mode: "onBlur",
      defaultValues: {
        role_id: null,
      },
    })
  
    const { data: rolesResponse } = useQuery({
      queryKey: ["roles"],
      queryFn: () => RolesService.getRoles(),
    })
  
    const mutation = useMutation({
      mutationFn: (data: AssignRoleForm) =>
        UsersService.updateUser({
          userId,
          requestBody: {
            role_id: data.role_id,
          },
        }),
      onSuccess: () => {
        showToast("Success!", "Role assigned successfully.", "success")
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
  
    const onSubmit: SubmitHandler<AssignRoleForm> = (data) => {
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
          <ModalHeader>Assign Role</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired isInvalid={!!errors.role_id}>
                <FormLabel htmlFor="role_id">Role</FormLabel>
                <Select
                  id="role_id"
                  {...register("role_id", {
                    required: "Role selection is required",
                  })}
                  placeholder="Select role"
                >
                  {rolesResponse?.data.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                      {role.description && ` - ${role.description}`}
                    </option>
                  ))}
                </Select>
                {errors.role_id && (
                  <FormErrorMessage>{errors.role_id.message}</FormErrorMessage>
                )}
              </FormControl>
            </VStack>
          </ModalBody>
  
          <ModalFooter gap={3}>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Assign
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )
  }
  
  export default AssignRole