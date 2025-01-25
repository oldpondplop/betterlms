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

import { type QuizCreate, QuizzesService } from "../../client"
import type { ApiError } from "../../client/core/ApiError"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"

interface AddQuizProps {
  isOpen: boolean
  onClose: () => void
}

const AddQuiz = ({ isOpen, onClose }: AddQuizProps) => {
  const queryClient = useQueryClient()
  const showToast = useCustomToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuizCreate>({
    mode: "onBlur",
    defaultValues: {
      max_attempts: 3,
      passing_threshold: 70,
      questions: [], // Start with an empty quiz
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: QuizCreate) => {
      return QuizzesService.createQuiz({ requestBody: data })
    },
    onSuccess: () => {
      showToast("Success!", "Quiz created successfully.", "success")
      reset()
      onClose()
    },
    onError: (err: ApiError) => {
      handleError(err, showToast)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes"] })
    },
  })

  const onSubmit: SubmitHandler<QuizCreate> = (data) => {
    mutation.mutate(data)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Add Quiz</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <FormControl isRequired isInvalid={!!errors.max_attempts}>
            <FormLabel htmlFor="max_attempts">Max Attempts</FormLabel>
            <Input
              id="max_attempts"
              type="number"
              {...register("max_attempts", { required: "Max attempts required" })}
            />
            {errors.max_attempts && <FormErrorMessage>{errors.max_attempts.message}</FormErrorMessage>}
          </FormControl>

          <FormControl mt={4} isRequired isInvalid={!!errors.passing_threshold}>
            <FormLabel htmlFor="passing_threshold">Passing Threshold (%)</FormLabel>
            <Input
              id="passing_threshold"
              type="number"
              {...register("passing_threshold", { required: "Passing threshold required" })}
            />
            {errors.passing_threshold && <FormErrorMessage>{errors.passing_threshold.message}</FormErrorMessage>}
          </FormControl>

          <FormControl mt={4} isRequired isInvalid={!!errors.questions}>
            <FormLabel htmlFor="questions">Quiz Questions (JSON Format)</FormLabel>
            <Textarea
              id="questions"
              {...register("questions", { required: "At least one question required" })}
              placeholder='[{"question": "What is 2+2?", "choices": ["3", "4", "5"], "answer": "4"}]'
            />
            {errors.questions && <FormErrorMessage>{errors.questions.message}</FormErrorMessage>}
          </FormControl>
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

export default AddQuiz
