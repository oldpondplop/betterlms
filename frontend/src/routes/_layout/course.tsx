import {
  Badge,
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
  useColorModeValue,
} from "@chakra-ui/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"
import { z } from "zod"

import { CoursesService} from "../../client"
import AddCourse from "../../components/Course/AddCourse"
import ActionsMenu from "../../components/Common/ActionsMenu"
import Navbar from "../../components/Common/Navbar"
import { PaginationFooter } from "../../components/Common/PaginationFooter"

const coursesSearchSchema = z.object({
  page: z.number().catch(1),
})

export const Route = createFileRoute("/_layout/course")({
  component: Courses,
  validateSearch: (search) => coursesSearchSchema.parse(search),
})

const PER_PAGE = 10

function getCoursesQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      CoursesService.getCourses({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    queryKey: ["courses", { page }],
  }
}

function CoursesTable() {
  const queryClient = useQueryClient()
  const { page } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const setPage = (page: number) =>
    navigate({ search: (prev: { [key: string]: string }) => ({ ...prev, page }) })

  const {
    data: courses,
    isPending,
    isPlaceholderData,
  } = useQuery({
    ...getCoursesQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const hasNextPage = !isPlaceholderData && courses?.length === PER_PAGE
  const hasPreviousPage = page > 1

  useEffect(() => {
    if (hasNextPage) {
      queryClient.prefetchQuery(getCoursesQueryOptions({ page: page + 1 }))
    }
  }, [page, queryClient, hasNextPage])

  return (
    <TableContainer>
      <Table size={{ base: "sm", md: "md" }} variant="simple">
        <Thead>
          <Tr>
            <Th fontSize="xs">TITLE</Th>
            <Th fontSize="xs">DESCRIPTION</Th>
            <Th fontSize="xs">DUE DATE</Th>
            <Th fontSize="xs">ASSIGNMENTS</Th>
            <Th fontSize="xs">STATUS</Th>
            <Th fontSize="xs">ACTIONS</Th>
          </Tr>
        </Thead>
        <Tbody>
          {isPending ? (
            <Tr>
              {[...Array(6)].map((_, index) => (
                <Td key={index}>
                  <SkeletonText noOfLines={1} paddingBlock="16px" />
                </Td>
              ))}
            </Tr>
          ) : (
            courses?.map((course) => (
              <Tr 
                key={course.id}
                cursor="pointer"
                _hover={{ bg: useColorModeValue("gray.50", "whiteAlpha.50") }}
                onClick={() => navigate({ to: "/courses/$courseId", params: { courseId: course.id } })}
              >
                <Td>
                  <Flex align="center" gap={2}>
                    {course.title}
                    {course.quiz && (
                      <Badge colorScheme="purple" variant="subtle">
                        quiz
                      </Badge>
                    )}
                  </Flex>
                </Td>
                <Td color={useColorModeValue("gray.600", "gray.300")} fontSize="sm">
                  {course.description || "No description"}
                </Td>
                <Td color={useColorModeValue("gray.600", "gray.300")} fontSize="sm">
                  {course.due_date ? new Date(course.due_date).toLocaleDateString() : "-"}
                </Td>
                <Td>
                  <Flex gap={2}>
                    <Badge 
                      colorScheme="blue" 
                      variant="subtle"
                      fontSize="xs"
                    >
                      {course.users.length} USERS
                    </Badge>
                    <Badge 
                      colorScheme="purple" 
                      variant="subtle"
                      fontSize="xs"
                    >
                      {course.roles.length} ROLES
                    </Badge>
                  </Flex>
                </Td>
                <Td>
                  <Badge
                    colorScheme={course.is_active ? "green" : "red"}
                    variant="subtle"
                  >
                    {course.is_active ? "ACTIVE" : "INACTIVE"}
                  </Badge>
                </Td>
                <Td onClick={(e) => e.stopPropagation()}>
                  <ActionsMenu 
                    type="Course" 
                    value={course}
                  />
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
  )
}

function Courses() {
  return (
    <Container maxW="full">
      <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12} color="white">
        Courses Management
      </Heading>
      <Navbar type="Course" addModalAs={AddCourse} />
      <CoursesTable />
    </Container>
  )
}

export default Courses