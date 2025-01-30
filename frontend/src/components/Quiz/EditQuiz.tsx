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
    Switch,
    Textarea,
    VStack,
    Grid,
    GridItem,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    HStack,
    IconButton,
    Icon,
    Box,
  } from "@chakra-ui/react";
  import { AddIcon, CloseIcon } from '@chakra-ui/icons';
  import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
  import { type SubmitHandler, useForm, Controller, useFieldArray } from "react-hook-form";
  import { useState, useEffect } from "react";
  import { 
    type QuizPublic, 
    type QuizUpdate,
    QuizzesService,
  } from "../../client";
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
  
    const {
      register,
      handleSubmit,
      reset,
      control,
      setValue,
      formState: { errors },
    } = useForm<QuizUpdate>({
      mode: "onBlur",
      defaultValues: {
        max_attempts: quiz.max_attempts,
        passing_threshold: quiz.passing_threshold,
        questions: quiz.questions || [], // Provide a default value if `quiz.questions` is undefined
      },
    });
  
    const { fields, append, remove } = useFieldArray({
      control,
      name: "questions",
    });
  
    useEffect(() => {
      if (quiz) {
        setValue("max_attempts", quiz.max_attempts);
        setValue("passing_threshold", quiz.passing_threshold);
        setValue("questions", quiz.questions || []); // Provide a default value if `quiz.questions` is undefined
      }
    }, [quiz, setValue]);
  
    const handleClose = () => {
      reset();
      onClose();
    };
  
    const mutation = useMutation({
      mutationFn: async (data: QuizUpdate) => {
        setSubmitting(true);
        try {
          return await QuizzesService.updateQuiz({
            quizId: quiz.id,
            requestBody: data,
          });
        } finally {
          setSubmitting(false);
        }
      },
      onSuccess: () => {
        showToast("Success!", "Quiz updated successfully.", "success");
        queryClient.invalidateQueries({ queryKey: ["quizzes"] });
        handleClose();
      },
      onError: (err) => {
        handleError(err, showToast);
      },
    });
  
    const onSubmit: SubmitHandler<QuizUpdate> = async (data) => {
      mutation.mutate(data);
    };
  
    return (
      <Modal isOpen={isOpen} onClose={handleClose} size={{ base: "sm", md: "lg" }} isCentered>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>Edit Quiz</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
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
                    <NumberInput min={0} max={3} defaultValue={quiz.questions?.[index]?.correct_index || 0}>
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
                      <FormErrorMessage>{errors.questions[index].correct_index?.message}</FormErrorMessage>
                    )}
                  </FormControl>
                </Box>
              ))}
  
              <Button
                leftIcon={<AddIcon />}
                onClick={() => append({ question: "", choices: ["", "", "", ""], correct_index: 0 })}
              >
                Add Question
              </Button>
            </VStack>
          </ModalBody>
  
          <ModalFooter gap={3}>
            <Button 
              variant="primary" 
              type="submit"
              isLoading={submitting}
            >
              Save
            </Button>
            <Button onClick={handleClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  };
  
  export default EditQuiz;