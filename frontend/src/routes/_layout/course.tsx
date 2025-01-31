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

import { CoursesService, type CourseDetailed, type UserPublic } from "../../client"
import AddCourse from "../../components/Course/AddCourse"
import ActionsMenu from "../../components/Common/ActionsMenu"
import Navbar from "../../components/Common/Navbar"
import { PaginationFooter } from "../../components/Common/PaginationFooter"

const coursesSearchSchema = z.object({
  page: z.number().catch(1),
})

export const Route = createFileRoute("/_layout/course")({
  component: Course,
  validateSearch: (search) => coursesSearchSchema.parse(search),
})

const PER_PAGE = 5

const RolesBadge = ({ count }: { count: number }) => (
  <Badge
    bg="rgba(0, 150, 255, 0.1)"
    color="blue.500"
    borderRadius="md"
    px={3}
    py={1}
    fontSize="sm"
    fontWeight="medium"
  >
    {count} ROLES
  </Badge>
)

const UsersBadge = ({ count }: { count: number }) => (
  <Badge
    bg="rgba(255, 150, 0, 0.1)"
    color="orange.500"
    borderRadius="md"
    px={3}
    py={1}
    fontSize="sm"
    fontWeight="medium"
  >
    {count} USERS
  </Badge>
)

function CoursesTable() {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const { page } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const setPage = (page: number) =>
    navigate({ search: (prev: {[key: string]: string}) => ({ ...prev, page }) })

  const {
    data: coursesResponse,
    isPending,
    isPlaceholderData,
  } = useQuery<{ data: CourseDetailed[], count: number }>({
    queryFn: () => CoursesService.readCourses({ 
      skip: (page - 1) * PER_PAGE, 
      limit: PER_PAGE 
    }),
    queryKey: ["courses", { page }],
    placeholderData: (prevData) => prevData,
  })

  const courses = coursesResponse?.data || []
  const hasNextPage = !isPlaceholderData && courses.length === PER_PAGE
  const hasPreviousPage = page > 1

  useEffect(() => {
    if (hasNextPage) {
      void queryClient.prefetchQuery({
        queryKey: ["courses", { page: page + 1 }],
        queryFn: () => CoursesService.readCourses({ skip: page * PER_PAGE, limit: PER_PAGE }),
      })
    }
  }, [hasNextPage, page, queryClient])

  return (
    <>
      <TableContainer>
        <Table size={{ base: "sm", md: "md" }}>
          <Thead>
            <Tr>
              <Th width="20%">Title</Th>
              <Th width="30%">Description</Th>
              <Th width="10%">Status</Th>
              <Th width="10%">Quiz</Th>
              <Th width="10%">Roles</Th>
              <Th width="10%">Users</Th>
              <Th width="10%">Actions</Th>
            </Tr>
          </Thead>
          {isPending ? (
            <Tbody>
              <Tr>
                {new Array(7).fill(null).map((_, index) => (
                  <Td key={index}>
                    <SkeletonText noOfLines={1} paddingBlock="16px" />
                  </Td>
                ))}
              </Tr>
            </Tbody>
          ) : (
            <Tbody>
              {courses?.map((course) => (
                <Tr key={course.id}>
                  <Td isTruncated maxWidth="200px">
                    {course.title}
                  </Td>
                  <Td isTruncated maxWidth="300px">
                    {course.description || "No description"}
                  </Td>
                  <Td>
                    <Flex gap={2}>
                      <Box
                        w="2"
                        h="2"
                        borderRadius="50%"
                        bg={course.is_active ? "ui.success" : "ui.danger"}
                        alignSelf="center"
                      />
                      {course.is_active ? "Active" : "Inactive"}
                    </Flex>
                  </Td>
                  <Td>
                    {course.quiz ? (
                      <Badge colorScheme="green">Available</Badge>
                    ) : (
                      <Badge colorScheme="gray">No Quiz</Badge>
                    )}
                  </Td>
                  <Td>
                    <RolesBadge count={course.roles?.length || 0} />
                  </Td>
                  <Td>
                    <UsersBadge count={course.users?.length || 0} />
                  </Td>
                  <Td>
                    <ActionsMenu
                      type="Course"
                      value={course}
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

function Course() {
  return (
    <Container maxW="full">
      <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12}>
        Courses Management
      </Heading>
      <Navbar type="Course" addModalAs={AddCourse} />
      <CoursesTable />
    </Container>
  )
}

export default Course