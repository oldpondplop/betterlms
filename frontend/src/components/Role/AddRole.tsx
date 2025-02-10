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
  import { type ApiError, type RoleCreate, RolesService } from "../../client"
  import useCustomToast from "../../hooks/useCustomToast"
  import { handleError } from "../../utils"
import React from "react"
  
  interface AddRoleProps {
    isOpen: boolean
    onClose: () => void
  }
  
  const AddRole = ({ isOpen, onClose }: AddRoleProps) => {
    const queryClient = useQueryClient()
    const showToast = useCustomToast()
  
    const {
      register,
      handleSubmit,
      reset,
      formState: { errors, isSubmitting },
    } = useForm<RoleCreate>({
      mode: "onBlur",
      criteriaMode: "all",
      defaultValues: {
        name: "",
      },
    })
  
    const mutation = useMutation({
      mutationFn: (data: RoleCreate) =>
        RolesService.createRole({ requestBody: data }),
      onSuccess: () => {
        showToast("Success!", "Role created successfully.", "success")
        reset()
        onClose()
      },
      onError: (err: ApiError) => {
        handleError(err, showToast)
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["roles"] })
      },
    })
  
    const onSubmit: SubmitHandler<RoleCreate> = (data) => {
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
          <ModalHeader>Add Role</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired isInvalid={!!errors.name}>
                <FormLabel htmlFor="name">Role Name</FormLabel>
                <Input
                  id="name"
                  {...register("name", {
                    required: "Role name is required.",
                    maxLength: {
                      value: 255,
                      message: "Role name cannot exceed 255 characters.",
                    },
                  })}
                  placeholder="Enter role name"
                  type="text"
                />
                {errors.name && (
                  <FormErrorMessage>{errors.name.message}</FormErrorMessage>
                )}
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
  
  export default AddRole