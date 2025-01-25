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

import { QuizzesService } from "../../client"
import useCustomToast from "../../hooks/useCustomToast"

interface DeleteQuizProps {
  quizId: string
  isOpen: boolean
  onClose: () => void
}

const DeleteQuiz = ({ quizId, isOpen, onClose }: DeleteQuizProps) => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()
  const cancelRef = React.useRef<HTMLButtonElement | null>(null)

  const { handleSubmit, formState: { isSubmitting } } = useForm()

  const mutation = useMutation({
    mutationFn: async () => {
      return QuizzesService.deleteQuiz({ quizId })
    },
    onSuccess: () => {
      showToast("Success!", "Quiz deleted successfully.", "success")
      queryClient.invalidateQueries({ queryKey: ["quizzes"] })
      onClose()
    },
    onError: () => {
      showToast("Error", "Failed to delete quiz.", "error")
    },
  })

  const onSubmit = async () => {
    mutation.mutate()
  }

  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose} size="md" isCentered>
      <AlertDialogOverlay>
        <AlertDialogContent as="form" onSubmit={handleSubmit(onSubmit)}>
          <AlertDialogHeader>Delete Quiz</AlertDialogHeader>

          <AlertDialogBody>
            <span>
              This quiz and all associated data will be <strong>permanently deleted.</strong>
            </span>
            <br />
            Are you sure? This action cannot be undone.
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

export default DeleteQuiz
