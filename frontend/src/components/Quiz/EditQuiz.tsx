import React from "react"
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
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"

import { type QuizBase, type QuizUpdate, QuizzesService } from "../../client"
import type { ApiError } from "../../client/core/ApiError"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"

interface EditQuizProps {
  quiz: QuizBase
  isOpen: boolean
  onClose: () => void
}

const EditQuiz = ({ quiz, isOpen, onClose }: EditQuizProps) => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<QuizUpdate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      max_attempts: quiz.max_attempts,
      passing_threshold: quiz.passing_threshold,
      questions: JSON.stringify(quiz.questions, null, 2), // Convert JSON to string for easy editing
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: QuizUpdate) => {
      return QuizzesService.updateQuiz({ quizId: quiz.id, requestBody: data })
    },
    onSuccess: () => {
      showToast("Success!", "Quiz updated successfully.", "success")
      onClose()
    },
    onError: (err: ApiError) => {
      handleError(err, showToast)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] }) // Refresh quiz list
    },
  })

  const onSubmit: SubmitHandler<QuizUpdate> = async (data) => {
    mutation.mutate({
      ...data,
      questions: JSON.parse(data.questions), // Convert back to JSON object
    })
  }

  const onCancel = () => {
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Edit Quiz</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <FormControl isRequired isInvalid={!!errors.max_attempts}>
            <FormLabel htmlFor="max_attempts">Max Attempts</FormLabel>
            <Input id="max_attempts" type="number" {...register("max_attempts")} />
            {errors.max_attempts && <FormErrorMessage>{errors.max_attempts.message}</FormErrorMessage>}
          </FormControl>

          <FormControl mt={4} isRequired isInvalid={!!errors.passing_threshold}>
            <FormLabel htmlFor="passing_threshold">Passing Threshold (%)</FormLabel>
            <Input id="passing_threshold" type="number" {...register("passing_threshold")} />
            {errors.passing_threshold && <FormErrorMessage>{errors.passing_threshold.message}</FormErrorMessage>}
          </FormControl>

          <FormControl mt={4} isRequired isInvalid={!!errors.questions}>
            <FormLabel htmlFor="questions">Quiz Questions (JSON Format)</FormLabel>
            <Textarea id="questions" {...register("questions")} placeholder='[{"question": "What is 2+2?", "choices": ["3", "4", "5"], "answer": "4"}]' />
            {errors.questions && <FormErrorMessage>{errors.questions.message}</FormErrorMessage>}
          </FormControl>
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

export default EditQuiz
