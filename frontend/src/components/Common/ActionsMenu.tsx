import {
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useDisclosure,
} from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import { FiEdit, FiTrash } from "react-icons/fi"

import type { UserPublic, CoursePublic } from "../../client"
import EditUser from "../Admin/EditUser"
import DeleteUser from "../Admin/DeleteUser"
import EditCourse from "../Course/EditCourse"
import DeleteCourse from "../Course/DeleteCourse"
// import EditQuiz from "../Quiz/EditQuiz"
// import DeleteQuiz from "../Quiz/DeleteQuiz"

// ✅ Define the possible types
interface ActionsMenuProps {
  type: "User" | "Course" 
  value: UserPublic | CoursePublic 
  disabled?: boolean
}

const ActionsMenu = ({ type, value, disabled }: ActionsMenuProps) => {
  const editModal = useDisclosure()
  const deleteModal = useDisclosure()

  return (
    <>
      <Menu>
        <MenuButton isDisabled={disabled} as={Button} rightIcon={<BsThreeDotsVertical />} variant="unstyled" />
        <MenuList>
          <MenuItem onClick={editModal.onOpen} icon={<FiEdit fontSize="16px" />}>
            Edit {type}
          </MenuItem>
          <MenuItem onClick={deleteModal.onOpen} icon={<FiTrash fontSize="16px" />} color="ui.danger">
            Delete {type}
          </MenuItem>
        </MenuList>
      </Menu>

      {/* ✅ Render Edit & Delete Modals based on type */}
      {type === "User" && (
        <>
          <EditUser user={value as UserPublic} isOpen={editModal.isOpen} onClose={editModal.onClose} />
          <DeleteUser userId={(value as UserPublic).id} isOpen={deleteModal.isOpen} onClose={deleteModal.onClose} />
        </>
      )}

      {type === "Course" && (
        <>
          <EditCourse course={value as CoursePublic} isOpen={editModal.isOpen} onClose={editModal.onClose} />
          <DeleteCourse courseId={(value as CoursePublic).id} isOpen={deleteModal.isOpen} onClose={deleteModal.onClose} />
        </>
      )}

    </>
  )
}

export default ActionsMenu