import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  IconButton,
  Image,
  Text,
  useDisclosure,
  Badge,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Button,
} from "@chakra-ui/react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { FiLogOut, FiMenu } from "react-icons/fi";
import { BellIcon } from "@chakra-ui/icons";

import Logo from "/assets/images/fastapi-logo.svg";
import type { UserPublic } from "../../client";
import useAuth from "../../hooks/useAuth";
import SidebarItems from "./SidebarItems";
import { NotificationsService } from "../../client";
import { useEffect } from "react";

const Sidebar = () => {
  const queryClient = useQueryClient();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { logout } = useAuth();
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"]);

  const { data: notifications, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => NotificationsService.getNotificationsEndpoint(),
    enabled: !!currentUser?.is_superuser,
  });

  useEffect(() => {
    if (currentUser?.is_superuser) {
      const interval = setInterval(() => {
        refetch();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentUser?.is_superuser, refetch]);

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      NotificationsService.markNotificationAsReadEndpoint({ notificationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  const handleLogout = async () => {
    logout();
  };

  const NotificationBell = () => (
    <Popover>
      <PopoverTrigger>
        <Box position="relative" mt={4}>
          <IconButton
            aria-label="Notifications"
            icon={<BellIcon boxSize={6} />}
            variant="ghost"
            size="lg"
            color="white"
          />
          {unreadCount > 0 && (
            <Badge
              colorScheme="red"
              borderRadius="full"
              position="absolute"
              top="-1"
              right="-1"
              fontSize="xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Box>
      </PopoverTrigger>
      <PopoverContent width="300px" maxHeight="400px" overflowY="auto" border="2px" borderColor="gray.900">
        <PopoverBody p={0}>
          {notifications?.length === 0 ? (
            <Text p={4} textAlign="center">No new notifications</Text>
          ) : (
            notifications?.map((notification: any) => (
              <Flex
                key={notification.id}
                p={3}
                borderBottom="1px solid"
                borderColor="gray.100"
                bg={notification.is_read ? "transparent" : "blue.50"}
                alignItems="center"
                justifyContent="space-between"
              >
                <Text fontSize="sm" flex="1">{notification.message}</Text>
                {!notification.is_read && (
                  <Button
                    size="xs"
                    onClick={() => markAsReadMutation.mutate(notification.id)}
                    ml={2}
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
  );

  return (
    <>
      {/* Mobile */}
      <IconButton
        onClick={onOpen}
        display={{ base: "flex", md: "none" }}
        aria-label="Open Menu"
        position="absolute"
        fontSize="20px"
        m={4}
        icon={<FiMenu />}
      />
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="250px" bg="gray.800">
          <DrawerCloseButton color="white" />
          <DrawerBody py={8}>
            <Flex flexDir="column" justify="space-between" h="full">
              <Box>
                <Flex flexDir="column" align="center">
                  <Image src={Logo} alt="logo" p={2} w="120px" />
                  {currentUser?.is_superuser && <NotificationBell />}
                </Flex>
                <SidebarItems onClose={onClose} />
              </Box>
              {currentUser?.email && (
                <Flex
                  direction="column"
                  borderTop="1px"
                  borderColor="gray.700"
                  pt={4}
                >
                  <Text color="gray.400" noOfLines={2} fontSize="sm" p={2}>
                    Logged in as: {currentUser.email}
                  </Text>
                  <Flex
                    as="button"
                    onClick={handleLogout}
                    p={2}
                    color="red.400"
                    fontWeight="bold"
                    alignItems="center"
                  >
                    <FiLogOut />
                    <Text ml={2}>Log out</Text>
                  </Flex>
                </Flex>
              )}
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Desktop */}
      <Box
        bg="gray.800"
        p={3}
        h="100vh"
        position="sticky"
        top="0"
        display={{ base: "none", md: "flex" }}
        minW="250px"
      >
        <Flex
          flexDir="column"
          justify="space-between"
          p={4}
          borderRadius={12}
          w="full"
        >
          <Box>
            <Flex flexDir="column" align="center">
              <Image src={Logo} alt="Logo" w="180px" p={2} />
              {currentUser?.is_superuser && <NotificationBell />}
            </Flex>
            <SidebarItems />
          </Box>
          {currentUser?.email && (
            <Flex
              direction="column"
              borderTop="1px"
              borderColor="gray.700"
              pt={4}
            >
              <Text color="gray.400" noOfLines={2} fontSize="sm" p={2}>
                Logged in as: {currentUser.email}
              </Text>
              <Flex
                as="button"
                onClick={handleLogout}
                p={2}
                color="red.400"
                fontWeight="bold"
                alignItems="center"
              >
                <FiLogOut />
                <Text ml={2}>Log out</Text>
              </Flex>
            </Flex>
          )}
        </Flex>
      </Box>
    </>
  );
};

export default Sidebar;