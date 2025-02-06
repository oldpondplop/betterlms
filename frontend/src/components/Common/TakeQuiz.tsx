import React, { useState } from 'react';
import { Box, Button, VStack, Text, Radio, RadioGroup, Flex, Modal, ModalOverlay, 
  ModalContent, ModalHeader, ModalBody, ModalFooter, Alert, AlertIcon, useToast } from '@chakra-ui/react';
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
  const [answerStatus, setAnswerStatus] = useState<boolean[]>([]);
  const toast = useToast();

  const { data: quiz, isLoading, error } = useQuery<QuizPublic | null>({
    queryKey: ['quizzes', courseId],
    queryFn: async () => {
      const response = await QuizzesService.readQuizzes();
      return response.data.find(q => q.course_id === courseId) || null;
    }
  });

  console.log('Quiz data:', quiz);

  const submitMutation = useMutation({
    mutationFn: async (answers: number[]) => {
      if (!quiz?.id) throw new Error('Quiz ID not found');
      console.log('Submitting answers:', {
        quizId: quiz.id,
        answers
      });
      try {
        const response = await QuizzesService.submitQuizAttempt({
          quizId: quiz.id,
          requestBody: answers
        });
        console.log('Submit response:', response);
        return response;
      } catch (error) {
        console.error('Submit error:', error);
        throw error;
      }
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

      console.log('Raw questions:', quiz.questions);
    const questions = quiz.questions as QuizQuestion[];
    console.log('Parsed questions:', questions);
      const currentQuestionData = questions[currentQuestion];
    console.log('Current question data:', currentQuestionData);

  const handleAnswerChange = (value: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestion] = parseInt(value);
    setUserAnswers(newAnswers);
    
    // Check answer against correct_index
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
            {/* Progress indicator */}
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