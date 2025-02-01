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

import { type CoursePublic, type UsersPublic, type RolesPublic, CoursesService } from "../../client"
import AddCourse from "../../components/Course/AddCourse"
import ActionsMenu from "../../components/Common/ActionsMenu"
import Navbar from "../../components/Common/Navbar"
import { PaginationFooter } from "../../components/Common/PaginationFooter"

const coursesSearchSchema = z.object({
  page: z.number().catch(1),
})

export const Route = createFileRoute("/_layout/course")({
  component: CoursesAdmin,
  validateSearch: (search) => coursesSearchSchema.parse(search),
})

const PER_PAGE = 5

function getCoursesQueryOptions({ page }: { page: number }) {
  return {
    queryFn: (): Promise<{ data: CoursePublic[]; count: number }> =>
      CoursesService.getCourses({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    queryKey: ["courses", { page }],
  }
}

function CoursesTable(): JSX.Element {
  const queryClient = useQueryClient()
  const { page } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const setPage = (page: number) =>
    navigate({ search: (prev: { [key: string]: string }) => ({ ...prev, page }) })

  // Fetch courses
  const {
    data: courses,
    isPending,
    isPlaceholderData,
  } = useQuery<{ data: CoursePublic[]; count: number }>({
    ...getCoursesQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  // Function to fetch assigned roles count
  const getAssignedRolesCount = async (courseId: string): Promise<number> => {
    try {
      const response: RolesPublic = await CoursesService.getCourseRoles({ courseId })
      return response.count
    } catch {
      return 0
    }
  }

  // Function to fetch assigned users count
  const getAssignedUsersCount = async (courseId: string): Promise<number> => {
    try {
      const response: UsersPublic = await CoursesService.getCourseUsers({ courseId })
      return response.count
    } catch {
      return 0
    }
  }

  const hasNextPage = !isPlaceholderData && courses?.data.length === PER_PAGE
  const hasPreviousPage = page > 1

  useEffect(() => {
    if (hasNextPage) {
      queryClient.prefetchQuery(getCoursesQueryOptions({ page: page + 1 }))
    }
  }, [page, queryClient, hasNextPage])

  return (
    <TableContainer>
      <Table size={{ base: "sm", md: "md" }}>
        <Thead>
          <Tr>
            <Th width="25%">Course Title</Th>
            <Th width="20%">Start Date</Th>
            <Th width="20%">End Date</Th>
            <Th width="10%">Roles</Th>
            <Th width="10%">Users</Th>
            <Th width="15%">Actions</Th>
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
            courses?.data.map((course) => (
              <Tr key={course.id}>
                <Td isTruncated maxWidth="200px">{course.title}</Td>
                <Td>{course.start_date || "N/A"}</Td>
                <Td>{course.end_date || "N/A"}</Td>
                <Td>
                  <AsyncCount fetchCount={() => getAssignedRolesCount(course.id)} />
                </Td>
                <Td>
                  <AsyncCount fetchCount={() => getAssignedUsersCount(course.id)} />
                </Td>
                <Td>
                  <ActionsMenu type="Course" value={course} />
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
      <PaginationFooter onChangePage={setPage} page={page} hasNextPage={hasNextPage} hasPreviousPage={hasPreviousPage} />
    </TableContainer>
  )
}

// Component to fetch and display async count
function AsyncCount({ fetchCount }: { fetchCount: () => Promise<number> }): JSX.Element {
  const { data, isLoading } = useQuery<number>({
    queryKey: [fetchCount],
    queryFn: fetchCount,
  })

  return isLoading ? <SkeletonText noOfLines={1} width="20px" /> : <>{data}</>
}

function CoursesAdmin(): JSX.Element {
  return (
    <Container maxW="full">
      <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12}>
        Courses Management
      </Heading>

      <Navbar type={"Course"} addModalAs={AddCourse} />
      <CoursesTable />
    </Container>
  )
}

export default CoursesAdmin
