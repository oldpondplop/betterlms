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

import { type UserPublic, UsersService, RolesService, type RolePublic } from "../../client"
import AddUser from "../../components/Admin/AddUser"
import ActionsMenu from "../../components/Common/ActionsMenu"
import Navbar from "../../components/Common/Navbar"
import { PaginationFooter } from "../../components/Common/PaginationFooter"

const usersSearchSchema = z.object({
  page: z.number().catch(1),
})

export const Route = createFileRoute("/_layout/admin")({
  component: Admin,
  validateSearch: (search) => usersSearchSchema.parse(search),
})

const PER_PAGE = 5

function getUsersQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      UsersService.getUsers({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    queryKey: ["users", { page }],
  }
}

function UsersTable() {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const { page } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const setPage = (page: number) =>
    navigate({ search: (prev: { [key: string]: string }) => ({ ...prev, page }) })

  // Fetch users
  const {
    data: users,
    isPending,
    isPlaceholderData,
  } = useQuery({
    ...getUsersQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  // Fetch roles separately
  const { data: roles, isLoading: loadingRoles } = useQuery<RolePublic[]>({
    queryKey: ["roles"],
    queryFn: () => RolesService.getRoles(),
  })

  // Function to get role name from role_id
  const getRoleName = (role_id?: string) => {
    if (!role_id || loadingRoles || !roles) return "N/A"
    const role = roles.find((r) => r.id === role_id)
    return role ? role.name : "N/A"
  }

  const hasNextPage = !isPlaceholderData && users?.data.length === PER_PAGE
  const hasPreviousPage = page > 1

  useEffect(() => {
    if (hasNextPage) {
      queryClient.prefetchQuery(getUsersQueryOptions({ page: page + 1 }))
    }
  }, [page, queryClient, hasNextPage])

  return (
    <TableContainer>
      <Table size={{ base: "sm", md: "md" }}>
        <Thead>
          <Tr>
            <Th width="15%">User ID</Th>
            <Th width="20%">Full Name</Th>
            <Th width="30%">Email</Th>
            <Th width="10%">Role</Th>
            <Th width="10%">Status</Th>
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
            users?.data.map((user) => (
              <Tr key={user.id}>
                <Td isTruncated maxWidth="120px">{user.user_id || "N/A"}</Td>
                <Td isTruncated maxWidth="150px" color={!user.name ? "ui.dim" : "inherit"}>
                  {user.name || "N/A"}
                  {currentUser?.id === user.id && (
                    <Badge ml="1" colorScheme="teal">You</Badge>
                  )}
                </Td>
                <Td isTruncated maxWidth="200px">{user.email}</Td>
                <Td>{user.is_superuser ? "Superuser" : getRoleName(user?.role_id || undefined)}</Td>
                <Td>
                  <Flex gap={2}>
                    <Box w="2" h="2" borderRadius="50%" bg={user.is_active ? "ui.success" : "ui.danger"} alignSelf="center" />
                    {user.is_active ? "Active" : "Inactive"}
                  </Flex>
                </Td>
                <Td>
                  <ActionsMenu type="User" value={user} disabled={currentUser?.id === user.id} />
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

function Admin() {
  return (
    <Container maxW="full">
      <Heading size="lg" textAlign={{ base: "center", md: "left" }} pt={12}>
        Users Management
      </Heading>

      <Navbar type={"User"} addModalAs={AddUser} />
      <UsersTable />
    </Container>
  )
}

export default Admin
