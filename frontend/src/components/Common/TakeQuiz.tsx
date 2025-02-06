import React, { useState } from 'react';
import { Box, Button, VStack, Text, Radio, RadioGroup, Flex, Modal, ModalOverlay, 
  ModalContent, ModalHeader, ModalBody, ModalFooter, Alert, AlertIcon, useToast } from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QuizzesService, type QuizPublic, type QuizQuestion, type QuizAttemptPublic } from '../../client';

interface TakeQuizProps {
  courseId: string;
  quizData: QuizPublic;
  isOpen: boolean;
  onClose: () => void;
}

const TakeQuiz: React.FC<TakeQuizProps> = ({ courseId, quizData, isOpen, onClose }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [answerStatus, setAnswerStatus] = useState<boolean[]>([]);
  const [quizResult, setQuizResult] = useState<QuizAttemptPublic | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();



  const submitMutation = useMutation({
    mutationFn: async (answers: number[]) => {
      if (!quizData?.id) throw new Error('Quiz ID not found');
      return await QuizzesService.submitQuizAttempt({
        quizId: quizData.id,
        requestBody: answers
      });
    },
    onSuccess: (attempt) => {
      setQuizResult(attempt);
      queryClient.invalidateQueries({ queryKey: ['quizAttempts', courseId] });
      toast({ 
        title: `Quiz ${attempt.passed ? 'passed! 🎉' : 'completed'}`,
        description: `Your score: ${attempt.score}%`,
        status: attempt.passed ? 'success' : 'warning'
      });
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
  if (!quizData?.questions?.length) return <Alert status="info"><AlertIcon />No questions</Alert>;

  const questions = quizData.questions as QuizQuestion[];
  const currentQuestionData = questions[currentQuestion];

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = parseInt(value);
    setUserAnswers(newAnswers);
    
    const newStatus = [...answerStatus];
    newStatus[currentQuestion] = parseInt(value) === currentQuestionData.correct_index;
    setAnswerStatus(newStatus);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handleSubmit = () => {
    const allQuestionsAnswered = questions.every((_, index) => 
      typeof userAnswers[index] === 'number'
    );
    if (allQuestionsAnswered) {
      console.log("Submitting answers:", userAnswers); // Add this line for debugging
      submitMutation.mutate(userAnswers);
    } else {
      toast({
        title: 'Please answer all questions',
        status: 'error',
      });
    }
  };

  if (quizResult) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Quiz {quizResult.passed ? 'Passed! 🎉' : 'Completed'}</ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Text fontSize="xl">Your Score: {quizResult.score}%</Text>
              <Text>
                {quizResult.passed ? 
                  "Congratulations! You've passed the quiz! 🌟" : 
                  `You need ${quizData.passing_threshold}% to pass. Keep practicing!`}
              </Text>
              <Text>Attempt {quizResult.attempt_number} of {quizData.max_attempts}</Text>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Course Quiz</ModalHeader>
        <ModalBody>
          <VStack spacing={6} align="stretch">
            <Flex align="center" mb={4}>
              {questions.map((_, index) => (
                <React.Fragment key={index}>
                  <Box
                    w="8"
                    h="8"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bg={
                      currentQuestion === index ? 'blue.500' :
                      answerStatus[index] === true ? 'green.500' :
                      answerStatus[index] === false ? 'red.500' :
                      'gray.600'
                    }
                    color="white"
                  >
                    {index + 1}
                  </Box>
                  {index < questions.length - 1 && (
                    <Box flex="1" h="1" mx="2" bg="gray.600">
                      <Box
                        h="full"
                        bg="blue.500"
                        transition="width 0.3s"
                        width={currentQuestion > index ? '100%' : '0%'}
                      />
                    </Box>
                  )}
                </React.Fragment>
              ))}
            </Flex>

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
          <Flex justify="flex-end" width="100%">
            {currentQuestion === questions.length - 1 ? (
              <Button
                colorScheme="green"
                onClick={handleSubmit}
                isLoading={submitMutation.isPending}
                isDisabled={!questions.every((_, index) => typeof userAnswers[index] === 'number')}
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