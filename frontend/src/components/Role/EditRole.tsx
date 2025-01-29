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
    Textarea,
    VStack,
  } from "@chakra-ui/react"
  import { useMutation, useQueryClient } from "@tanstack/react-query"
  import { type SubmitHandler, useForm } from "react-hook-form"
  import {
    type ApiError,
    type RolePublic,
    type RoleUpdate,
    RolesService,
  } from "../../client"
  import useCustomToast from "../../hooks/useCustomToast"
  import { handleError } from "../../utils"
import React from "react"
  
  interface EditRoleProps {
    role: RolePublic
    isOpen: boolean
    onClose: () => void
  }
  
  const EditRole = ({ role, isOpen, onClose }: EditRoleProps) => {
    const queryClient = useQueryClient()
    const showToast = useCustomToast()
  
    const {
      register,
      handleSubmit,
      reset,
      formState: { isSubmitting, errors, isDirty },
    } = useForm<RoleUpdate>({
      mode: "onBlur",
      criteriaMode: "all",
      defaultValues: {
        name: role.name,
        description: role.description || "",
      },
    })
  
    const mutation = useMutation({
      mutationFn: (data: RoleUpdate) =>
        RolesService.updateRole({ roleId: role.id, requestBody: data }),
      onSuccess: () => {
        showToast("Success!", "Role updated successfully.", "success")
        onClose()
      },
      onError: (err: ApiError) => {
        handleError(err, showToast)
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["roles"] })
      },
    })
  
    const onSubmit: SubmitHandler<RoleUpdate> = async (data) => {
      mutation.mutate(data)
    }
  
    const onCancel = () => {
      reset()
      onClose()
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
          <ModalHeader>Edit Role</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isInvalid={!!errors.name}>
                <FormLabel htmlFor="name">Role Name</FormLabel>
                <Input
                  id="name"
                  {...register("name", {
                    maxLength: {
                      value: 255,
                      message: "Role name cannot exceed 255 characters.",
                    },
                  })}
                  type="text"
                />
                {errors.name && (
                  <FormErrorMessage>{errors.name.message}</FormErrorMessage>
                )}
              </FormControl>
  
              <FormControl>
                <FormLabel htmlFor="description">Description</FormLabel>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Role description"
                  rows={3}
                />
              </FormControl>
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
  
  export default EditRole