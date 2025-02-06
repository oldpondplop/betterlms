import React, { useState } from 'react';
import {
  Box, Button, VStack, Text, Radio, RadioGroup, Progress, 
  Flex, Heading, Alert, AlertIcon, useToast, Modal, ModalOverlay, 
  ModalContent, ModalHeader, ModalBody, ModalFooter
} from '@chakra-ui/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { QuizzesService, type QuizPublic, type QuizQuestion } from '../../client';

interface TakeQuizProps {
  courseId: string;
  isOpen: boolean;
  onClose: () => void;
}

const TakeQuiz: React.FC<TakeQuizProps> = ({ courseId, isOpen, onClose }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const toast = useToast();

  const { data: quiz, isLoading, error } = useQuery<QuizPublic | null>({
    queryKey: ['quizzes', courseId],
    queryFn: async () => {
      const response = await QuizzesService.readQuizzes();
      return response.data.find(q => q.course_id === courseId) || null;
    }
  });

  const submitMutation = useMutation({
    mutationFn: (answers: number[]) => {
      if (!quiz?.id) throw new Error('Quiz ID not found');
      return QuizzesService.submitQuizAttempt({
        quizId: quiz.id,
        requestBody: answers
      });
    },
    onSuccess: () => {
      toast({ title: 'Quiz submitted successfully', status: 'success' });
      onClose();
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to submit quiz',
        description: error.message,
        status: 'error'
      });
    }
  });

  if (!isOpen) return null;
  if (isLoading) return <Text>Loading quiz...</Text>;
  if (error) return <Alert status="error"><AlertIcon />Error loading quiz</Alert>;
  if (!quiz?.questions?.length) return <Alert status="info"><AlertIcon />No questions</Alert>;

  const questions = quiz.questions as QuizQuestion[];
  const currentQuestionData = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = parseInt(value);
    setUserAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (userAnswers.length === questions.length) {
      submitMutation.mutate(userAnswers);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Course Quiz</ModalHeader>
        <ModalBody>
          <VStack spacing={6} align="stretch">
            <Progress value={progress} size="sm" colorScheme="blue" />
            <Text>Question {currentQuestion + 1} of {questions.length}</Text>

            <Box>
              <Text fontSize="lg" mb={4}>{currentQuestionData.question}</Text>
              <RadioGroup onChange={handleAnswerChange} value={userAnswers[currentQuestion]?.toString()}>
                <VStack align="stretch" spacing={3}>
                  {currentQuestionData.choices.map((choice, index) => (
                    <Radio key={index} value={index.toString()}>{choice}</Radio>
                  ))}
                </VStack>
              </RadioGroup>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Flex justify="space-between" width="100%">
            <Button onClick={handlePrevious} isDisabled={currentQuestion === 0}>
              Previous
            </Button>
            {currentQuestion === questions.length - 1 ? (
              <Button
                colorScheme="green"
                onClick={handleSubmit}
                isLoading={submitMutation.isPending}
                isDisabled={userAnswers.length !== questions.length}
              >
                Submit Quiz
              </Button>
            ) : (
              <Button
                colorScheme="blue"
                onClick={handleNext}
                isDisabled={typeof userAnswers[currentQuestion] !== 'number'}
              >
                Next
              </Button>
            )}
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TakeQuiz;