// frontend/src/routes/_layout/quiz.tsx
import {
    Badge,
    Box,
    Container,
    Flex,
    Heading,
    SkeletonText,
    Table,
    TableContainer,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Input,
    NumberInput,
    NumberInputField,
    useToast,
  } from "@chakra-ui/react";
  import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
  import { createFileRoute, useNavigate } from "@tanstack/react-router";
  import { useEffect, useState } from "react";
  import { z } from "zod";
  
  import { type Quiz, QuizzesService } from "../../client";
  import ActionsMenu from "../../components/Common/ActionsMenu";
  import Navbar from "../../components/Common/Navbar";
  import { PaginationFooter } from "../../components/Common/PaginationFooter";
  
  // Schema for search params
  const quizzesSearchSchema = z.object({
    page: z.number().catch(1),
  });
  
  export const Route = createFileRoute("/_layout/quiz")({
    component: QuizManagement,
    validateSearch: (search) => quizzesSearchSchema.parse(search),
  });
  
  const PER_PAGE = 5;
  
  // Fetch quizzes with pagination
  function getQuizzesQueryOptions({ page }: { page: number }) {
    return {
      queryFn: () =>
        QuizzesService.readQuizzes({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
      queryKey: ["quizzes", { page }],
    };
  }
  
  // Quiz Table Component
  function QuizzesTable() {
    const queryClient = useQueryClient();
    const { page } = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    const setPage = (page: number) =>
      navigate({ search: (prev: { page: number }) => ({ ...prev, page }) });
  
    const {
      data: quizzes,
      isPending,
      isPlaceholderData,
      error,
    } = useQuery({
      ...getQuizzesQueryOptions({ page }),
      placeholderData: (prevData) => prevData,
    });
  
    const hasNextPage = !isPlaceholderData && quizzes?.length === PER_PAGE;
    const hasPreviousPage = page > 1;
  
    useEffect(() => {
      if (hasNextPage) {
        queryClient.prefetchQuery(getQuizzesQueryOptions({ page: page + 1 }));
      }
    }, [page, queryClient, hasNextPage]);
  
    if (error) {
      return <Box>Error loading quizzes: {error.message}</Box>;
    }
  
    return (
      <TableContainer>
        <Table size={{ base: "sm", md: "md" }}>
          <Thead>
            <Tr>
              <Th width="20%">Course</Th>
              <Th width="20%">Quiz ID</Th>
              <Th width="15%">Max Attempts</Th>
              <Th width="15%">Passing Threshold</Th>
              <Th width="15%">Questions</Th>
              <Th width="15%">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isPending ? (
              [...Array(5)].map((_, index) => (
                <Tr key={`skeleton-${index}`}>
                  {[...Array(6)].map((__, colIndex) => (
                    <Td key={`skeleton-td-${index}-${colIndex}`}>
                      <SkeletonText noOfLines={1} paddingBlock="16px" />
                    </Td>
                  ))}
                </Tr>
              ))
            ) : quizzes?.length === 0 ? (
              <Tr>
                <Td colSpan={6} textAlign="center">
                  No quizzes found.
                </Td>
              </Tr>
            ) : (
              quizzes?.map((quiz: Quiz) => (
                <Tr key={quiz.id}>
                  <Td isTruncated maxWidth="180px">{quiz.course?.title || "N/A"}</Td>
                  <Td>{quiz.id}</Td>
                  <Td>{quiz.max_attempts}</Td>
                  <Td>{quiz.passing_threshold}%</Td>
                  <Td>{quiz.questions?.length || 0}</Td>
                  <Td>
                    <ActionsMenu type="Quiz" value={quiz} />
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
        <PaginationFooter
          onChangePage={setPage}
          page={page}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
        />
      </TableContainer>
    );
  }
  
  // Add Quiz Modal Component
  function AddQuiz() {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();
    const [formData, setFormData] = useState({
      course_id: "", // Use snake_case
      max_attempts: 3,
      passing_threshold: 70,
      questions: [],
    });
  
    const createQuiz = useMutation({
      mutationFn: QuizzesService.createQuiz,
      onSuccess: () => {
        toast({
          title: "Quiz created successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        onClose();
      },
      onError: (error) => {
        toast({
          title: "Error creating quiz.",
          description: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      },
    });
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      createQuiz.mutate(formData);
    };
  
    return (
      <>
        <Button onClick={onOpen} colorScheme="teal">
          Add Quiz
        </Button>
        <Modal isOpen={isOpen} onClose={onClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Add Quiz</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <form onSubmit={handleSubmit}>
                <FormControl>
                  <FormLabel>Course ID</FormLabel>
                  <Input
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  />
                </FormControl>
                <FormControl mt={4}>
                  <FormLabel>Max Attempts</FormLabel>
                  <NumberInput
                    defaultValue={3}
                    min={1}
                    max={10}
                    value={formData.max_attempts}
                    onChange={(value) => setFormData({ ...formData, max_attempts: parseInt(value) })}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl mt={4}>
                  <FormLabel>Passing Threshold (%)</FormLabel>
                  <NumberInput
                    defaultValue={70}
                    min={0}
                    max={100}
                    value={formData.passing_threshold}
                    onChange={(value) => setFormData({ ...formData, passing_threshold: parseInt(value) })}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <Button type="submit" mt={4} colorScheme="teal">
                  Create Quiz
                </Button>
              </form>
            </ModalBody>
          </ModalContent>
        </Modal>
      </>
    );
  }
  
  // Main Quiz Management Page
  function QuizManagement() {
    return (
      <Container maxW="full">
        <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12}>
          Quiz Management
        </Heading>
        <Navbar type="Quiz" addModalAs={AddQuiz} />
        <QuizzesTable />
      </Container>
    );
  }
  
  export default QuizManagement;