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
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  HStack,
  IconButton,
  VStack,
  Grid,
  GridItem,
  Select,
  Box,
} from "@chakra-ui/react";
import { AddIcon, CloseIcon } from "@chakra-ui/icons";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { SubmitHandler, useForm, useFieldArray, Controller } from "react-hook-form";
import { useState, useEffect } from "react";
import { QuizUpdate, QuizzesService, CoursesService, CoursePublic, QuizPublic, CoursesPublic } from "../../client";
import useCustomToast from "../../hooks/useCustomToast";
import { handleError } from "../../utils";

interface EditQuizProps {
  quiz: QuizPublic;
  isOpen: boolean;
  onClose: () => void;
}

const EditQuiz = ({ quiz, isOpen, onClose }: EditQuizProps) => {
  const queryClient = useQueryClient();
  const showToast = useCustomToast();
  const [submitting, setSubmitting] = useState(false);

  // Fetch courses for the dropdown
// Fetch courses for the dropdown
const { data: coursesResponse, isLoading: isCoursesLoading } = useQuery<CoursesPublic>({
  queryKey: ["courses"],
  queryFn: () => CoursesService.readCourses({ skip: 0, limit: 100 }),
});

// Extract courses from the response
const courses = coursesResponse?.data || [];

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<QuizUpdate>({
    mode: "onBlur",
    defaultValues: {
      max_attempts: quiz.max_attempts,
      passing_threshold: quiz.passing_threshold,
      questions: quiz.questions?.map(q => ({
        question: q.question as string,
        choices: q.choices as string[],
        correct_index: q.correct_index as number,
      })) || [],
      course_id: quiz.course_id,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "questions",
  });

  // Reset form when modal opens or quiz changes
  useEffect(() => {
    if (isOpen) {
      reset({
        max_attempts: quiz.max_attempts,
        passing_threshold: quiz.passing_threshold,
        questions: quiz.questions?.map(q => ({
          question: q.question as string,
          choices: q.choices as string[],
          correct_index: q.correct_index as number,
        })) || [],
        course_id: quiz.course_id,
      });
    }
  }, [isOpen, quiz, reset]);

  const mutation = useMutation({
    mutationFn: (data: QuizUpdate) => {
      // Convert QuizQuestion objects to plain objects
      const serializedData = {
        ...data,
        questions: data.questions?.map(q => ({
          question: q.question,
          choices: q.choices,
          correct_index: q.correct_index
        }))
      };
      return QuizzesService.updateQuiz({
        quizId: quiz.id,
        requestBody: serializedData,
      });
    },
    onSuccess: () => {
      showToast("Success!", "Quiz updated successfully.", "success");
      queryClient.invalidateQueries({ queryKey: ["quizzes"] });
      onClose();
    },
    onError: (error) => {
      handleError(error, showToast);
    },
  });

  const onSubmit: SubmitHandler<QuizUpdate> = async (data) => {
    setSubmitting(true);
    try {
      await mutation.mutateAsync(data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: "sm", md: "lg" }} isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
        <ModalHeader>Edit Quiz</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* Course Selection Dropdown */}
            <FormControl isRequired isInvalid={!!errors.course_id}>
              <FormLabel>Course</FormLabel>
              <Controller
                name="course_id"
                control={control}
                rules={{ required: "Course selection is required" }}
                render={({ field }) => (
                  <Select 
                    placeholder="Select course" 
                    {...field}
                    value={field.value || ''} // Convert null/undefined to empty string
                  >
                    {isCoursesLoading ? (
                      <option>Loading...</option>
                    ) : (
                      courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))
                    )}
                  </Select>
                )}
              />
              <FormErrorMessage>{errors.course_id?.message}</FormErrorMessage>
            </FormControl>

            {/* Max Attempts and Passing Threshold */}
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <GridItem>
                <FormControl isRequired isInvalid={!!errors.max_attempts}>
                  <FormLabel>Max Attempts</FormLabel>
                  <NumberInput min={1} max={10} defaultValue={quiz.max_attempts}>
                    <NumberInputField
                      {...register("max_attempts", {
                        required: "Max attempts is required.",
                        min: {
                          value: 1,
                          message: "Max attempts must be at least 1.",
                        },
                        max: {
                          value: 10,
                          message: "Max attempts cannot exceed 10.",
                        },
                      })}
                    />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  {errors.max_attempts && (
                    <FormErrorMessage>{errors.max_attempts.message}</FormErrorMessage>
                  )}
                </FormControl>
              </GridItem>

              <GridItem>
                <FormControl isRequired isInvalid={!!errors.passing_threshold}>
                  <FormLabel>Passing Threshold (%)</FormLabel>
                  <NumberInput min={0} max={100} defaultValue={quiz.passing_threshold}>
                    <NumberInputField
                      {...register("passing_threshold", {
                        required: "Passing threshold is required.",
                        min: {
                          value: 0,
                          message: "Passing threshold must be at least 0.",
                        },
                        max: {
                          value: 100,
                          message: "Passing threshold cannot exceed 100.",
                        },
                      })}
                    />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  {errors.passing_threshold && (
                    <FormErrorMessage>{errors.passing_threshold.message}</FormErrorMessage>
                  )}
                </FormControl>
              </GridItem>
            </Grid>

            {/* Dynamic Questions Section */}
            {fields.map((field, index) => (
              <Box key={field.id} borderWidth="1px" borderRadius="lg" p={4}>
                <HStack justifyContent="space-between" mb={4}>
                  <FormLabel>Question {index + 1}</FormLabel>
                  <IconButton
                    aria-label="Remove question"
                    icon={<CloseIcon />}
                    size="sm"
                    onClick={() => remove(index)}
                  />
                </HStack>

                <FormControl isRequired isInvalid={!!errors.questions?.[index]?.question}>
                  <FormLabel>Question Text</FormLabel>
                  <Input
                    {...register(`questions.${index}.question`, {
                      required: "Question text is required.",
                    })}
                    placeholder="Enter question text"
                  />
                  {errors.questions?.[index]?.question && (
                    <FormErrorMessage>{errors.questions[index].question?.message}</FormErrorMessage>
                  )}
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.questions?.[index]?.choices}>
                  <FormLabel>Choices</FormLabel>
                  <VStack spacing={2}>
                    {[0, 1, 2, 3].map((choiceIndex) => (
                      <Input
                        key={choiceIndex}
                        {...register(`questions.${index}.choices.${choiceIndex}`, {
                          required: "Choice is required.",
                        })}
                        placeholder={`Choice ${choiceIndex + 1}`}
                      />
                    ))}
                  </VStack>
                  {errors.questions?.[index]?.choices && (
                    <FormErrorMessage>{errors.questions[index].choices?.message}</FormErrorMessage>
                  )}
                </FormControl>

                <FormControl isRequired isInvalid={!!errors.questions?.[index]?.correct_index}>
                  <FormLabel>Correct Answer Index</FormLabel>
                  <NumberInput min={0} max={3} defaultValue={field.correct_index}>
                    <NumberInputField
                      {...register(`questions.${index}.correct_index`, {
                        required: "Correct answer index is required.",
                        min: {
                          value: 0,
                          message: "Index must be at least 0.",
                        },
                        max: {
                          value: 3,
                          message: "Index cannot exceed 3.",
                        },
                      })}
                    />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  {errors.questions?.[index]?.correct_index && (
                    <FormErrorMessage>
                      {errors.questions[index].correct_index?.message}
                    </FormErrorMessage>
                  )}
                </FormControl>
              </Box>
            ))}

            {/* Add Question Button */}
            <Button
              leftIcon={<AddIcon />}
              onClick={() => append({ question: "", choices: ["", "", "", ""], correct_index: 0 })}
            >
              Add Question
            </Button>
          </VStack>
        </ModalBody>

        {/* Modal Footer */}
        <ModalFooter gap={3}>
          <Button variant="primary" type="submit" isLoading={submitting}>
            Save Changes
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EditQuiz;