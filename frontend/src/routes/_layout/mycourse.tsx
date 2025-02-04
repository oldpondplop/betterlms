import {
    Badge,
    Box,
    Button,
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
  } from "@chakra-ui/react";
  import { useQuery, useQueryClient } from "@tanstack/react-query";
  import { createFileRoute, useNavigate } from "@tanstack/react-router";
  import { useEffect, useState } from "react";
  import { z } from "zod";
  
  import { type CoursePublic, CoursesService } from "../../client";
  import { PaginationFooter } from "../../components/Common/PaginationFooter";
  
  const coursesSearchSchema = z.object({
    page: z.number().catch(1),
  });
  
  export const Route = createFileRoute("/_layout/mycourse")({
    component: MyCourses,
    validateSearch: (search) => coursesSearchSchema.parse(search),
  });
  
  const PER_PAGE = 5;
  
  function getCoursesQueryOptions({ page, userId }: { page: number; userId: string }) {
    return {
      queryFn: () => CoursesService.getUserCourses(),
      queryKey: ["courses", { page, userId }],
    };
  }
  
  function CoursesTable({ userId }: { userId: string }) {
    const queryClient = useQueryClient();
    const { page } = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    const setPage = (page: number) =>
      navigate({ search: (prev: { [key: string]: string }) => ({ ...prev, page }) });
  
    const {
      data: courses,
      isPending,
      isPlaceholderData,
    } = useQuery({
      ...getCoursesQueryOptions({ page, userId }),
      placeholderData: (prevData) => prevData,
    });
  
    const hasNextPage = !isPlaceholderData && courses?.length === PER_PAGE;
    const hasPreviousPage = page > 1;
  
    useEffect(() => {
      if (hasNextPage) {
        queryClient.prefetchQuery(getCoursesQueryOptions({ page: page + 1, userId }));
      }
    }, [page, queryClient, hasNextPage, userId]);
  
    return (
      <TableContainer>
        <Table size={{ base: "sm", md: "md" }}>
          <Thead>
            <Tr>
              <Th width="40%">Course Title</Th>
              <Th width="30%">Status</Th>
              <Th width="30%">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isPending ? (
              <Tr>
                {[...Array(3)].map((_, index) => (
                  <Td key={index}>
                    <SkeletonText noOfLines={1} paddingBlock="16px" />
                  </Td>
                ))}
              </Tr>
            ) : (
              courses?.map((course) => (
                <Tr key={course.id}>
                  <Td>{course.title}</Td>
                  <Td>
                    <Flex gap={2} alignItems="center">
                      <Box w="2" h="2" borderRadius="50%" bg={course.status === "completed" ? "ui.success" : "ui.warning"} />
                      {course.status ? course.status.charAt(0).toUpperCase() + course.status.slice(1) : "Unknown"}
                    </Flex>
                  </Td>
                  <Td>
                    <Button as="a" href={`/course/${course.id}`} colorScheme="teal">
                      View Course
                    </Button>
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
  
  function MyCourses() {
    const queryClient = useQueryClient();
    const currentUser = queryClient.getQueryData<{ id: string }>(["currentUser"]);
    const userId = currentUser?.id;
  
    if (!userId) return <div>Loading user data...</div>;
  
    return (
      <Container maxW="full">
        <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12}>
          My Courses
        </Heading>
        <CoursesTable userId={userId} />
      </Container>
    );
  }
  
  export default MyCourses;
  