import {
    Button,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Switch,
    Textarea,
    VStack,
  } from "@chakra-ui/react"
  import { useMutation, useQueryClient } from "@tanstack/react-query"
  import { type SubmitHandler, useForm } from "react-hook-form"
  import { type ApiError, type CourseCreate, CoursesService } from "../../client"
  import useCustomToast from "../../hooks/useCustomToast"
  import { handleError } from "../../utils"
  
  interface AddCourseProps {
    isOpen: boolean
    onClose: () => void
  }
  
  const AddCourse = ({ isOpen, onClose }: AddCourseProps) => {
    const queryClient = useQueryClient()
    const showToast = useCustomToast()
  
    const {
      register,
      handleSubmit,
      reset,
      formState: { errors, isSubmitting },
    } = useForm<CourseCreate>({
      mode: "onBlur",
      criteriaMode: "all",
      defaultValues: {
        title: "",
        description: "",
        materials: [],
        is_active: true,
        start_date: null,
        end_date: null,
      },
    })
  
    const mutation = useMutation({
      mutationFn: (data: CourseCreate) =>
        CoursesService.createCourse({ requestBody: data }),
      onSuccess: () => {
        showToast("Success!", "Course created successfully.", "success")
        reset()
        onClose()
      },
      onError: (err: ApiError) => {
        handleError(err, showToast)
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["courses"] })
      },
    })
  
    const onSubmit: SubmitHandler<CourseCreate> = (data) => {
      // Convert dates to ISO string format if they exist
      const formattedData = {
        ...data,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
        end_date: data.end_date ? new Date(data.end_date).toISOString() : null,
      }
      mutation.mutate(formattedData)
    }
  
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size={{ base: "sm", md: "lg" }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>Add Course</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired isInvalid={!!errors.title}>
                <FormLabel htmlFor="title">Title</FormLabel>
                <Input
                  id="title"
                  {...register("title", {
                    required: "Title is required.",
                    maxLength: {
                      value: 255,
                      message: "Title cannot exceed 255 characters.",
                    },
                  })}
                  placeholder="Course Title"
                  type="text"
                />
                {errors.title && (
                  <FormErrorMessage>{errors.title.message}</FormErrorMessage>
                )}
              </FormControl>
  
              <FormControl>
                <FormLabel htmlFor="description">Description</FormLabel>
                <Textarea
                  id="description"
                  {...register("description", {
                    maxLength: {
                      value: 500,
                      message: "Description cannot exceed 500 characters.",
                    },
                  })}
                  placeholder="Course Description"
                  rows={3}
                />
                {errors.description && (
                  <FormErrorMessage>{errors.description.message}</FormErrorMessage>
                )}
              </FormControl>
  
              <FormControl>
                <FormLabel htmlFor="start_date">Start Date</FormLabel>
                <Input
                  id="start_date"
                  {...register("start_date")}
                  type="date"
                />
              </FormControl>
  
              <FormControl>
                <FormLabel htmlFor="end_date">End Date</FormLabel>
                <Input
                  id="end_date"
                  {...register("end_date")}
                  type="date"
                />
              </FormControl>
  
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="is_active" mb="0">
                  Active Status
                </FormLabel>
                <Switch
                  id="is_active"
                  {...register("is_active")}
                  defaultChecked
                />
              </FormControl>
            </VStack>
          </ModalBody>
  
          <ModalFooter gap={3}>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>
              Save
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )
  }
  
  export default AddCourse