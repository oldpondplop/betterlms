import {
    Badge,
    Container,
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
  import { useEffect } from "react";
  import { z } from "zod";
  
  import { RolesService, type RolePublic, type UserPublic } from "../../client";
  import AddRole from "../../components/Role/AddRole";
  import ActionsMenu from "../../components/Common/ActionsMenu";
  import Navbar from "../../components/Common/Navbar";
  import { PaginationFooter } from "../../components/Common/PaginationFooter";
  
  const rolesSearchSchema = z.object({
    page: z.number().catch(1),
  });
  
  export const Route = createFileRoute("/_layout/role")({
    component: Role,
    validateSearch: (search) => rolesSearchSchema.parse(search),
  });
  
  const PER_PAGE = 5;
  
  function getRolesQueryOptions({ page }: { page: number }) {
    return {
      queryKey: ["roles", { page }],
      queryFn: () => RolesService.getRoles(),
    };
  }
  
  function getUsersByRoleQueryOptions(roleId: string) {
    return {
      queryKey: ["roleUsers", roleId],
      queryFn: () =>
        RolesService.getUsersByRole({
          roleId,
          skip: 0,
          limit: 100,
        }),
    };
  }
  
  function RoleRow({ role }: { role: RolePublic }) {
    const queryClient = useQueryClient();
    const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);
    const { data: usersData } = useQuery(getUsersByRoleQueryOptions(role.id));
    const usersCount = usersData?.data.length || 0;
  
    return (
      <Tr>
        <Td isTruncated maxWidth="200px">
          {role.name}
        </Td>
        <Td isTruncated maxWidth="300px">
          {role.description || "No description"}
        </Td>
        <Td>
          <Badge colorScheme={usersCount > 0 ? "blue" : "gray"}>
            {usersCount > 0 ? `${usersCount} Users` : "No Users"}
          </Badge>
        </Td>
        <Td>
          <ActionsMenu
            type="Role"
            value={role}
            disabled={!currentUser?.is_superuser}
          />
        </Td>
      </Tr>
    );
  }
  
  function RolesTable() {
    const queryClient = useQueryClient();
    const { page } = Route.useSearch();
    const navigate = useNavigate({ from: Route.fullPath });
    const setPage = (page: number) =>
      navigate({ search: (prev: { [key: string]: string }) => ({ ...prev, page }) });
  
    const {
      data: roles,
      isPending,
      isPlaceholderData,
    } = useQuery({
      ...getRolesQueryOptions({ page }),
      placeholderData: (prevData) => prevData,
    });
  
    // Prefetch users for each role
    useEffect(() => {
      if (roles?.data) {
        roles.data.forEach((role) => {
          queryClient.prefetchQuery(getUsersByRoleQueryOptions(role.id));
        });
      }
    }, [roles?.data, queryClient]);
  
    const hasNextPage = !isPlaceholderData && roles?.data.length === PER_PAGE;
    const hasPreviousPage = page > 1;
  
    useEffect(() => {
      if (hasNextPage) {
        queryClient.prefetchQuery(getRolesQueryOptions({ page: page + 1 }));
      }
    }, [page, queryClient, hasNextPage]);
  
    return (
      <>
        <TableContainer>
          <Table size={{ base: "sm", md: "md" }}>
            <Thead>
              <Tr>
                <Th width="30%">Name</Th>
                <Th width="40%">Description</Th>
                <Th width="15%">Users</Th>
                <Th width="15%">Actions</Th>
              </Tr>
            </Thead>
            {isPending ? (
              <Tbody>
                <Tr>
                  {new Array(4).fill(null).map((_, index) => (
                    <Td key={index}>
                      <SkeletonText noOfLines={1} paddingBlock="16px" />
                    </Td>
                  ))}
                </Tr>
              </Tbody>
            ) : (
              <Tbody>
                {roles?.data.map((role: RolePublic) => (
                  <RoleRow key={role.id} role={role} />
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
    );
  }
  
  function Role() {
    return (
      <Container maxW="full">
        <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12}>
          Roles Management
        </Heading>
  
        <Navbar type="Role" addModalAs={AddRole} />
        <RolesTable />
      </Container>
    );
  }