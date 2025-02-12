import {
  Box,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Flex,
  Text,
  Button,
  Badge,
 } from "@chakra-ui/react"
 import { Link } from "@tanstack/react-router"
 import { FaUserAstronaut } from "react-icons/fa"
 import { FiLogOut, FiUser } from "react-icons/fi"
 import { BellIcon } from "@chakra-ui/icons"
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
 import { NotificationsService } from "../../client"
 import useAuth from "../../hooks/useAuth"
 
 const UserMenu = () => {
  const { logout } = useAuth()
  const queryClient = useQueryClient()
 
  const { data: notifications} = useQuery({
    queryKey: ["notifications"],
    queryFn: () => NotificationsService.getNotificationsEndpoint(),
  })
 
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) =>
      NotificationsService.markNotificationAsReadEndpoint({ notificationId: notificationId.toString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
 
  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0
 
  const handleLogout = async () => {
    logout()
  }
 
  return (
    <>
      {/* Desktop */}
      <Box
        display={{ base: "none", md: "block" }}
        position="fixed"
        top={4}
        right={4}
      >
        <Flex gap={2}>
          <Popover>
            <PopoverTrigger>
              <Box position="relative">
                <IconButton
                  aria-label="Notifications"
                  icon={<BellIcon />}
                  variant="ghost"
                  size="md"
                  color="white"
                  bg="ui.main"
                  isRound
                />
                {unreadCount > 0 && (
                  <Badge
                    colorScheme="red"
                    borderRadius="full"
                    position="absolute"
                    top="-2"
                    right="-2"
                    fontSize="sm"
                    px={2}
                    py={1}
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Box>
            </PopoverTrigger>
            <PopoverContent width="300px" maxHeight="400px" overflowY="auto" bg="gray.800" borderColor="gray.600">
              <PopoverBody p={0}>
                {notifications?.length === 0 ? (
                  <Text p={4} textAlign="center" color="white">No new notifications</Text>
                ) : (
                  notifications?.map((notification: any) => (
                    <Flex
                      key={notification.id}
                      p={3}
                      borderBottom="1px solid"
                      borderColor="gray.700"
                      bg={notification.is_read ? "transparent" : "gray.700"}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Text fontSize="sm" flex="1" color="white">{notification.message}</Text>
                      {!notification.is_read && (
                        <Button
                          size="xs"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          ml={2}
                          colorScheme="blue"
                        >
                          Mark Read
                        </Button>
                      )}
                    </Flex>
                  ))
                )}
              </PopoverBody>
            </PopoverContent>
          </Popover>
 
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Options"
              icon={<FaUserAstronaut color="white" fontSize="18px" />}
              bg="ui.main"
              isRound
              data-testid="user-menu"
            />
            <MenuList>
              <MenuItem icon={<FiUser fontSize="18px" />} as={Link} to="settings">
                My profile
              </MenuItem>
              <MenuItem
                icon={<FiLogOut fontSize="18px" />}
                onClick={handleLogout}
                color="ui.danger"
                fontWeight="bold"
              >
                Log out
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Box>
    </>
  )
 }
 
 export default UserMenu