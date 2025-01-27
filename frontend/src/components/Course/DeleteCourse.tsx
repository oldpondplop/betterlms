import {
    AlertDialog,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    Button,
  } from "@chakra-ui/react"
  import { useMutation, useQueryClient } from "@tanstack/react-query"
  import React from "react"
  import { useForm } from "react-hook-form"
  
  import { CoursesService } from "../../client"
  import useCustomToast from "../../hooks/useCustomToast"
  
  interface DeleteCourseProps {
    courseId: string // UUID expected
    isOpen: boolean
    onClose: () => void
  }
  
  const DeleteCourse = ({ courseId, isOpen, onClose }: DeleteCourseProps) => {
    const queryClient = useQueryClient()
    const showToast = useCustomToast()
    const cancelRef = React.useRef<HTMLButtonElement | null>(null)
  
    const { handleSubmit, formState: { isSubmitting } } = useForm()
  
    // Function to delete a course using the UUID
    const deleteCourse = async (uuid: string) => {
      await CoursesService.deleteCourse({ courseId: uuid }) // Ensures UUID is passed correctly
    }
  
    const mutation = useMutation({
      mutationFn: deleteCourse,
      onSuccess: () => {
        showToast("Success", "Course deleted successfully.", "success")
        queryClient.invalidateQueries({ queryKey: ["courses"] }) // Refresh courses list
        onClose()
      },
      onError: () => {
        showToast("Error", "An error occurred while deleting the course.", "error")
      },
    })
  
    const onSubmit = async () => {
      mutation.mutate(courseId) // Ensure UUID is passed
    }
  
    return (
      <AlertDialog
        isOpen={isOpen}
        onClose={onClose}
        leastDestructiveRef={cancelRef}
        size={{ base: "sm", md: "md" }}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent as="form" onSubmit={handleSubmit(onSubmit)}>
            <AlertDialogHeader>Delete Course</AlertDialogHeader>
  
            <AlertDialogBody>
              <span>
                All data associated with this course will be <strong>permanently deleted.</strong>
              </span>
              <br />
              Are you sure? You will not be able to undo this action.
            </AlertDialogBody>
  
            <AlertDialogFooter gap={3}>
              <Button variant="danger" type="submit" isLoading={isSubmitting}>
                Delete
              </Button>
              <Button ref={cancelRef} onClick={onClose} isDisabled={isSubmitting}>
                Cancel
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    )
  }
  
  export default DeleteCourse
  