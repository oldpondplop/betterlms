import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Button,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import React from "react"
import { useForm } from "react-hook-form"

import { UsersService } from "../../client"
import useCustomToast from "../../hooks/useCustomToast"

interface DeleteUserProps {
  userId: string // UUID expected
  isOpen: boolean
  onClose: () => void
}

const DeleteUser = ({ userId, isOpen, onClose }: DeleteUserProps) => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()
  const cancelRef = React.useRef<HTMLButtonElement | null>(null)

  const { handleSubmit, formState: { isSubmitting } } = useForm()

  // Function to delete a user using the UUID
  const deleteUser = async (uuid: string) => {
    await UsersService.deleteUser({ userId: uuid }) // Ensures UUID is passed correctly
  }

  const mutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      showToast("Success", "User deleted successfully.", "success")
      queryClient.invalidateQueries({ queryKey: ["users"] }) // Refresh users list
      onClose()
    },
    onError: () => {
      showToast("Error", "An error occurred while deleting the user.", "error")
    },
  })

  const onSubmit = async () => {
    mutation.mutate(userId) // Ensure UUID is passed
  }

  return (
    <AlertDialog
      isOpen={isOpen}
      onClose={onClose}
      leastDestructiveRef={cancelRef}
      size={{ base: "sm", md: "md" }}
      isCentered
    >
      <AlertDialogOverlay>
        <AlertDialogContent as="form" onSubmit={handleSubmit(onSubmit)}>
          <AlertDialogHeader>Delete User</AlertDialogHeader>

          <AlertDialogBody>
            <span>
              All data associated with this user will be <strong>permanently deleted.</strong>
            </span>
            <br />
            Are you sure? You will not be able to undo this action.
          </AlertDialogBody>

          <AlertDialogFooter gap={3}>
            <Button variant="danger" type="submit" isLoading={isSubmitting}>
              Delete
            </Button>
            <Button ref={cancelRef} onClick={onClose} isDisabled={isSubmitting}>
              Cancel
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

export default DeleteUser
