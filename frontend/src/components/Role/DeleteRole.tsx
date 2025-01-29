import {
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
  } from "@chakra-ui/react"
  import { useMutation, useQueryClient } from "@tanstack/react-query"
  import { type ApiError, type RolePublic, RolesService } from "../../client"
  import useCustomToast from "../../hooks/useCustomToast"
  import { handleError } from "../../utils"
import React from "react"
  
  interface DeleteRoleProps {
    role: RolePublic
    isOpen: boolean
    onClose: () => void
  }
  
  const DeleteRole = ({ role, isOpen, onClose }: DeleteRoleProps) => {
    const queryClient = useQueryClient()
    const showToast = useCustomToast()
  
    const mutation = useMutation({
      mutationFn: () => RolesService.deleteRole({ roleId: role.id }),
      onSuccess: () => {
        showToast("Success!", "Role deleted successfully.", "success")
        onClose()
      },
      onError: (err: ApiError) => {
        handleError(err, showToast)
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["roles"] })
      },
    })
  
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size={{ base: "sm", md: "md" }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Role</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text>
              Are you sure you want to delete the role <strong>{role.name}</strong>?
              This action cannot be undone.
            </Text>
          </ModalBody>
  
          <ModalFooter gap={3}>
            <Button
              colorScheme="red"
              onClick={() => mutation.mutate()}
              isLoading={mutation.isPending}
            >
              Delete
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )
  }
  
  export default DeleteRole