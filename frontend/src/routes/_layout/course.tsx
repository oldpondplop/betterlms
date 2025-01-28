import {
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
    Tooltip,
    Text,
    useToast,
} from "@chakra-ui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { CoursesService } from "../../client";
import ActionsMenu from "../../components/Common/ActionsMenu";
import { PaginationFooter } from "../../components/Common/PaginationFooter";
import AddCourse from "../../components/Course/AddCourse";
import { CoursePublic, UserPublic, CoursesGetAssignedUsersForCourseData } from "../../client";
import React from "react";

const coursesSearchSchema = z.object({
    page: z.number().catch(1),
});

export const Route = createFileRoute("/_layout/course")({
    component: Course,
    validateSearch: (search) => coursesSearchSchema.parse(search),
});

const PER_PAGE = 5;

function getCoursesQueryOptions({ page }: { page: number }) {
    return {
        queryFn: () => CoursesService.readCourses({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
        queryKey: ["courses", { page }],
        retry: 1,
        retryDelay: 1000,
    };
}

function useUserDetails(courseId: string) {
    return useQuery<UserPublic[]>({
        queryKey: ["courseUsers", courseId],
        queryFn: async () => {
            if (!courseId) return [];
            const params: CoursesGetAssignedUsersForCourseData = {
                courseId: courseId
            };
            const response = await CoursesService.getAssignedUsersForCourse(params);
            return response;
        },
        enabled: Boolean(courseId),
    });
}

interface UsersCellProps {
    courseId: string;
    userIds: string[];
}

function UsersCell({ courseId, userIds }: UsersCellProps) {
    const { data: users = [], isLoading } = useUserDetails(courseId);
    
    if (!userIds?.length) return <Text>None</Text>;
    if (isLoading) return <SkeletonText noOfLines={1} />;

    // Create a map of user IDs to user details
    const userMap = new Map(users.map(user => [user.id, user]));
    
    // Get the display names, falling back to ID if user not found
    const displayNames = userIds.map(id => {
        const user = userMap.get(id);
        return user ? user.email : id;
    }).join(", ");

    return (
        <Tooltip label={displayNames} aria-label="Assigned Users">
            <Text isTruncated maxWidth="120px">
                {displayNames}
            </Text>
        </Tooltip>
    );
}

function CoursesTable() {
    const queryClient = useQueryClient();
    const { page } = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    const toast = useToast();
    const toastIdRef = React.useRef<string | number>();

    const setPage = (page: number) =>
        navigate({ search: (prev: { [key: string]: string }) => ({ ...prev, page }) });

    const {
        data: courses,
        isPending,
        isPlaceholderData,
        error,
    } = useQuery({
        ...getCoursesQueryOptions({ page }),
        placeholderData: (prevData) => prevData,
    });

    useEffect(() => {
        if (error && !toastIdRef.current) {
            toastIdRef.current = toast({
                title: "Error",
                description: "Failed to fetch courses",
                status: "error",
                duration: 5000,
                isClosable: true,
            });
        }
    }, [error, toast]);

    const hasNextPage = !isPlaceholderData && courses?.data.length === PER_PAGE;
    const hasPreviousPage = page > 1;

    useEffect(() => {
        if (hasNextPage) {
            queryClient.prefetchQuery(getCoursesQueryOptions({ page: page + 1 }));
        }
    }, [page, queryClient, hasNextPage]);

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
                        courses?.data.map((course: CoursePublic) => (
                            <Tr key={course.id}>
                                <Td isTruncated maxWidth="180px">
                                    {course.title}
                                </Td>
                                <Td
                                    isTruncated
                                    maxWidth="250px"
                                    color={!course.description ? "ui.dim" : "inherit"}
                                >
                                    {course.description || "N/A"}
                                </Td>
                                <Td>
                                    {course.assigned_roles && course.assigned_roles.length > 0 ? (
                                        <Tooltip
                                            label={course.assigned_roles.join(", ")}
                                            aria-label="Assigned Roles"
                                        >
                                            <Text isTruncated maxWidth="120px">
                                                {course.assigned_roles.join(", ")}
                                            </Text>
                                        </Tooltip>
                                    ) : (
                                        "None"
                                    )}
                                </Td>
                                <Td>
                                    <UsersCell 
                                        courseId={course.id.toString()} 
                                        userIds={course.assigned_users?.map(id => id.toString()) || []} 
                                    />
                                </Td>
                                <Td>{course.start_date || "N/A"}</Td>
                                <Td>{course.end_date || "N/A"}</Td>
                                <Td>
                                    <Flex gap={2}>
                                        <Box
                                            w="2"
                                            h="2"
                                            borderRadius="50%"
                                            bg={course.is_active ? "green.500" : "red.500"}
                                            alignSelf="center"
                                        />
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
    );
}

function Course() {
    const [isModalOpen, setModalOpen] = useState(false);

    return (
        <Container maxW="full">
            <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12}>
                Courses Management
            </Heading>
            <Button onClick={() => setModalOpen(true)} colorScheme="teal" mb={4}>
                Add Course
            </Button>
            <AddCourse isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
            <CoursesTable />
        </Container>
    );
}

export default Course;