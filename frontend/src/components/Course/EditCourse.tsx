import {
    Button,
    Checkbox,
    Flex,
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
    Textarea,
    Menu,
    MenuButton,
    MenuList,
    CheckboxGroup,
    useDisclosure,
    MenuItem,
    Text,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm, Controller } from "react-hook-form"
import { ChevronDownIcon } from "@chakra-ui/icons"

import {
    type ApiError,
    type CoursePublic,
    type CourseUpdate,
    CoursesService,
} from "../../client"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"
import React from "react"

// ✅ Role Options List
const roleOptions = [
    "admin",
    "employee",
    "infirmiera",
    "oficianta",
    "brancardier",
    "asistent medical",
    "femeie de serviciu",
    "masaj",
    "kinetoterapie",
    "receptie",
    "contabilitate",
    "informatica",
    "resurse umane",
    "epidemiolog",
    "managementul calitatii",
    "farmacist",
    "birou internari/externari",
]

interface EditCourseProps {
    course: CoursePublic
    isOpen: boolean
    onClose: () => void
}

const EditCourse = ({ course, isOpen, onClose }: EditCourseProps) => {
    const queryClient = useQueryClient()
    const showToast = useCustomToast()

    const {
        register,
        handleSubmit,
        reset,
        control,
        watch,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<CourseUpdate>({
        mode: "onBlur",
        defaultValues: {
            title: course.title,
            description: course.description,
            is_active: course.is_active,
            start_date: course.start_date || null,
        },
    })


    const mutation = useMutation({
        mutationFn: async (data: CourseUpdate) => {
            return CoursesService.updateCourse({ courseId: course.id, requestBody: data })
        },
        onSuccess: () => {
            showToast("Success!", "Course updated successfully.", "success")
            onClose()
        },
        onError: (err: ApiError) => {
            handleError(err, showToast)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["courses"] }) // Refresh course list
        },
    })

    const onSubmit: SubmitHandler<CourseUpdate> = async (data) => {
        const filteredData: CourseUpdate = {
            title: data.title || "",
            description: data.description || "",
            is_active: data.is_active || false,
            end_date: data.end_date || null,
            start_date: data.start_date || null,
        }

        mutation.mutate(filteredData)
    }

    const onCancel = () => {
        reset()
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
            <ModalOverlay />
            <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
                <ModalHeader>Edit Course</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    {/* Course Title */}
                    <FormControl isRequired isInvalid={!!errors.title}>
                        <FormLabel htmlFor="title">Course Title</FormLabel>
                        <Input
                            id="title"
                            {...register("title", { required: "Course title is required" })}
                            type="text"
                        />
                        {errors.title && <FormErrorMessage>{errors.title.message}</FormErrorMessage>}
                    </FormControl>

                    {/* Course Description */}
                    <FormControl mt={4} isInvalid={!!errors.description}>
                        <FormLabel htmlFor="description">Description</FormLabel>
                        <Textarea
                            id="description"
                            {...register("description")}
                            placeholder="Enter course description"
                        />
                        {errors.description && <FormErrorMessage>{errors.description.message}</FormErrorMessage>}
                    </FormControl>


                    {/* Active & Due Date Checkboxes */}
                    <Flex mt={4}>
                        <FormControl>
                            <Checkbox {...register("is_active")} colorScheme="teal">
                                Is Active?
                            </Checkbox>
                        </FormControl>
                    </Flex>

                    {/* Due Date */}
                    <FormControl mt={4} isInvalid={!!errors.end_date}>
                        <FormLabel htmlFor="due_date">Due Date</FormLabel>
                        <Input
                            id="due_date"
                            type="date"
                            {...register("end_date")}
                        />
                        {errors.end_date && <FormErrorMessage>{errors.end_date.message}</FormErrorMessage>}
                    </FormControl>
                </ModalBody>

                <ModalFooter gap={3}>
                    <Button variant="primary" type="submit" isLoading={isSubmitting} isDisabled={!isDirty}>
                        Save
                    </Button>
                    <Button onClick={onCancel}>Cancel</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}

export default EditCourse