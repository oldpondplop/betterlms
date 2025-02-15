import { Box, Flex, Icon, Text, useColorModeValue } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { 
  FiHome, 
  FiSettings, 
  FiUsers, 
  FiBookOpen, 
  FiFileText 
} from "react-icons/fi"
import type { UserPublic } from "../../client"

const items = [
  { icon: FiHome, title: "Dashboard", path: "/" },
  { icon: FiBookOpen, title: "Courses", path: "/course" },
  { icon: FiFileText, title: "Quizzes", path: "/quiz" },
  { icon: FiFileText, title: "Quiz Analytics", path: "/analytics" },
  { icon: FiSettings, title: "Roles", path: "/role" },
  { icon: FiSettings, title: "User Settings", path: "/settings" },
  { icon: FiSettings, title: "MyCourses", path: "/mycourse" },
]

interface SidebarItemsProps {
  onClose?: () => void
}

const SidebarItems = ({ onClose }: SidebarItemsProps) => {
  const queryClient = useQueryClient()
  const textColor = useColorModeValue("ui.main", "ui.light")
  const bgActive = useColorModeValue("#E2E8F0", "#4A5568")
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])

  const finalItems = currentUser?.is_superuser
    ? [...items, { icon: FiUsers, title: "Admin", path: "/admin" }]
    : items

  return (
    <Box>
      {finalItems.map(({ icon, title, path }) => (
        <Flex
          as={Link}
          to={path}
          w="100%"
          p={2}
          key={title}
          activeProps={{
            style: {
              background: bgActive,
              borderRadius: "12px",
            },
          }}
          color={textColor}
          onClick={onClose}
        >
          <Icon as={icon} alignSelf="center" />
          <Text ml={2}>{title}</Text>
        </Flex>
      ))}
    </Box>
  )
}

export default SidebarItems