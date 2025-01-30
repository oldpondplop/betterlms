import {
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  useDisclosure,
} from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import { FiEdit, FiTrash2, FiLayers } from "react-icons/fi"
import type { UserPublic, CoursePublic, RolePublic, QuizPublic } from "../../client"

// Components imports
import EditUser from "../Admin/EditUser"
import DeleteUser from "../Admin/DeleteUser"
import EditCourse from "../Course/EditCourse"
import DeleteCourse from "../Course/DeleteCourse"
import EditRole from "../Role/EditRole"
import DeleteRole from "../Role/DeleteRole"
import EditQuiz from "../Quiz/EditQuiz"
import DeleteQuiz from "../Quiz/DeleteQuiz"

type ActionsMenuProps = {
  disabled?: boolean
} & (
  | { type: "User"; value: UserPublic }
  | { type: "Course"; value: CoursePublic }
  | { type: "Role"; value: RolePublic }
  | { type: "Quiz"; value: QuizPublic }
)

const ActionsMenu = ({ type, value, disabled }: ActionsMenuProps) => {
  const editModal = useDisclosure()
  const deleteModal = useDisclosure()
  const assignModal = useDisclosure()

  return (
    <>
      <Menu>
        <MenuButton
          as={IconButton}
          aria-label="Options"
          icon={<BsThreeDotsVertical />}
          variant="ghost"
          size="sm"
          isDisabled={disabled}
        />
        <MenuList>
          <MenuItem 
            icon={<FiEdit size="1rem" />}
            onClick={editModal.onOpen}
          >
            Edit {type}
          </MenuItem>
          {type === "Role" && (
            <MenuItem 
              icon={<FiLayers size="1rem" />}
              onClick={assignModal.onOpen}
            >
              Assign {type}
            </MenuItem>
          )}
          <MenuItem 
            icon={<FiTrash2 size="1rem" />}
            onClick={deleteModal.onOpen}
            color="ui.danger"
          >
            Delete {type}
          </MenuItem>
        </MenuList>
      </Menu>

      {type === "User" && (
        <>
          <EditUser
            user={value}
            isOpen={editModal.isOpen}
            onClose={editModal.onClose}
          />
          <DeleteUser
            userId={value.id}
            isOpen={deleteModal.isOpen}
            onClose={deleteModal.onClose}
          />
        </>
      )}

      {type === "Course" && (
        <>
          <EditCourse
            course={value}
            isOpen={editModal.isOpen}
            onClose={editModal.onClose}
          />
          <DeleteCourse
            courseId={value.id}
            isOpen={deleteModal.isOpen}
            onClose={deleteModal.onClose}
          />
        </>
      )}

      {type === "Role" && (
        <>
          <EditRole
            role={value}
            isOpen={editModal.isOpen}
            onClose={editModal.onClose}
          />
          <DeleteRole
            role={value}
            isOpen={deleteModal.isOpen}
            onClose={deleteModal.onClose}
          />
        </>
      )}

      {type === "Quiz" && (
        <>
          <EditQuiz
            quiz={value}
            isOpen={editModal.isOpen}
            onClose={editModal.onClose}
          />
          <DeleteQuiz
            quizId={value.id}
            isOpen={deleteModal.isOpen}
            onClose={deleteModal.onClose}
          />
        </>
      )}
    </>
  )
}

export default ActionsMenu