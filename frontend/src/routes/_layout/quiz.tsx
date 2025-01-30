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
  } from "@chakra-ui/react"
  import { useQuery, useQueryClient } from "@tanstack/react-query"
  import { createFileRoute, useNavigate } from "@tanstack/react-router"
  import { useEffect } from "react"
  import { z } from "zod"
  
  import { QuizzesService, CoursesService, type QuizPublic, type UserPublic, CoursePublic } from "../../client"
  import AddQuiz from "../../components/Quiz/AddQuiz"
  import Navbar from "../../components/Common/Navbar"
  import { PaginationFooter } from "../../components/Common/PaginationFooter"
  import ActionsMenu from "../../components/Common/ActionsMenu"
  
  const quizSearchSchema = z.object({
    page: z.number().catch(1),
  })
  
  export const Route = createFileRoute("/_layout/quiz")({
    component: Quiz,
    validateSearch: (search) => quizSearchSchema.parse(search),
  })
  
  const PER_PAGE = 5
  
  const QuestionsBadge = ({ count }: { count: number }) => (
    <Badge
      bg="rgba(0, 150, 255, 0.1)"
      color="blue.500"
      borderRadius="md"
      px={3}
      py={1}
      fontSize="sm"
      fontWeight="medium"
    >
      {count} QUESTIONS
    </Badge>
  )
  
  const ThresholdBadge = ({ threshold }: { threshold: number }) => (
    <Badge
      bg="rgba(0, 200, 0, 0.1)"
      color="green.500"
      borderRadius="md"
      px={3}
      py={1}
      fontSize="sm"
      fontWeight="medium"
    >
      {threshold}% TO PASS
    </Badge>
  )
  
  function QuizzesTable() {
    const queryClient = useQueryClient()
    const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
    const { page } = Route.useSearch()
    const navigate = useNavigate({ from: Route.fullPath })
    const setPage = (page: number) =>
      navigate({ search: (prev: {[key: string]: string}) => ({ ...prev, page }) })
  
    const { data: courses } = useQuery<CoursePublic[]>({
        queryFn: async () => {
          const response = await CoursesService.readCourses()
          return response
        },
        queryKey: ["courses"],
      })
  
    const {
      data: quizzes,
      isPending,
      isPlaceholderData,
    } = useQuery({
      queryFn: async () => {
        const response = await QuizzesService.readQuizzes({
          skip: (page - 1) * PER_PAGE,
          limit: PER_PAGE
        })
        return response.data
      },
      queryKey: ["quizzes", { page }],
      placeholderData: (prevData) => prevData,
    })
  
    const hasNextPage = !isPlaceholderData && (quizzes?.length ?? 0) === PER_PAGE
    const hasPreviousPage = page > 1
  
    useEffect(() => {
      if (hasNextPage) {
        void queryClient.prefetchQuery({
          queryKey: ["quizzes", { page: page + 1 }],
          queryFn: async () => {
            const response = await QuizzesService.readQuizzes({
              skip: page * PER_PAGE,
              limit: PER_PAGE
            })
            return response.data
          },
        })
      }
    }, [hasNextPage, page, queryClient])
  
    return (
      <>
        <TableContainer>
          <Table size={{ base: "sm", md: "md" }}>
            <Thead>
              <Tr>
                <Th width="20%">Course</Th>
                <Th width="15%">Questions</Th>
                <Th width="15%">Attempts</Th>
                <Th width="15%">Pass Threshold</Th>
                <Th width="15%">Analytics</Th>
                <Th width="20%">Actions</Th>
              </Tr>
            </Thead>
            {isPending ? (
              <Tbody>
                <Tr>
                  {new Array(6).fill(null).map((_, index) => (
                    <Td key={index}>
                      <SkeletonText noOfLines={1} paddingBlock="16px" />
                    </Td>
                  ))}
                </Tr>
              </Tbody>
            ) : (
              <Tbody>
                {quizzes?.map((quiz: QuizPublic) => (
                  <Tr key={quiz.id}>
                    <Td isTruncated maxWidth="200px">
                        {courses?.find(course => course.id === quiz.course_id)?.title ?? quiz.course_id}
                    </Td>
                    <Td>
                      <QuestionsBadge count={quiz.questions?.length ?? 0} />
                    </Td>
                    <Td>
                      <Badge colorScheme="purple">
                        Max {quiz.max_attempts}
                      </Badge>
                    </Td>
                    <Td>
                      <ThresholdBadge threshold={quiz.passing_threshold ?? 0} />
                    </Td>
                    <Td>
                      <Flex gap={2}>
                        <Badge
                          colorScheme="blue"
                          cursor="pointer"
                          onClick={() => navigate({
                            to: `/quiz/${quiz.id}/analytics`
                          })}
                        >
                          View Stats
                        </Badge>
                      </Flex>
                    </Td>
                    <Td>
                      <ActionsMenu
                        type="Quiz"
                        value={quiz}
                        disabled={!currentUser?.is_superuser}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            )}
          </Table>
        </TableContainer>
        <PaginationFooter
          onChangePage={setPage}
          page={page}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
        />
      </>
    )
  }
  
  function Quiz() {
    return (
      <Container maxW="full">
        <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12}>
          Quiz Management
        </Heading>
  
        <Navbar type="Quiz" addModalAs={AddQuiz} />
        <QuizzesTable />
      </Container>
    )
  }
  
  export default Quiz;