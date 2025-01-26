import {
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

import { CoursesService } from "../../client"
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

function getCoursesQueryOptions({ page }: { page: number }) {
    return {
        queryFn: () =>
            CoursesService.readCourses({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
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
                <Th width="20%">Title</Th>
                <Th width="30%">Description</Th>
                <Th width="20%">Roles</Th>
                <Th width="20%">Users</Th>
                <Th width="10%">Start Date</Th>
                <Th width="10%">End Date</Th>
                <Th width="10%">Status</Th>
                <Th width="10%">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {isPending ? (
                <Tr>
                  {[...Array(8)].map((_, index) => (
                    <Td key={index}>
                      <SkeletonText noOfLines={1} paddingBlock="16px" />
                    </Td>
                  ))}
                </Tr>
              ) : (
                courses?.data.map((course) => (
                  <Tr key={course.id}>
                    <Td isTruncated maxWidth="180px">{course.title}</Td>
                    <Td isTruncated maxWidth="250px" color={!course.description ? "ui.dim" : "inherit"}> {course.description || "N/A"}</Td>
                    <Td>{course.assigned_roles?.length || 0}</Td>
                    <Td>{course.assigned_users?.length || 0}</Td>
                    <Td>{course.start_date || "N/A"}</Td>
                    <Td>{course.end_date || "N/A"}</Td>
                    <Td>
                      <Flex gap={2}>
                        <Box w="2" h="2" borderRadius="50%" bg={course.is_active ? "ui.success" : "ui.danger"} alignSelf="center" />
                        {course.is_active ? "Active" : "Inactive"}
                      </Flex>
                    </Td>
                    <Td>
                      <ActionsMenu type="Course" value={course} />
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
function Course() {
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

export default Course