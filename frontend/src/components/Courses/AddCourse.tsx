import {
    Button,
    Checkbox,
    CheckboxGroup,
    Flex,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Input,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    Textarea,
    useDisclosure,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm, Controller } from "react-hook-form"
import { ChevronDownIcon } from "@chakra-ui/icons"

import { type CourseCreate, CoursesService } from "../../client"
import type { ApiError } from "../../client/core/ApiError"
import useCustomToast from "../../hooks/useCustomToast"
import { handleError } from "../../utils"

// Role options for multi-select dropdown
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
        control,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CourseCreate>({
        mode: "onBlur",
        defaultValues: {
            title: "",
            description: "",
            assign_to_roles: [],
            is_active: true,
            is_due: false,
        },
    })

    const selectedRoles = watch("assign_to_roles") || []

    const mutation = useMutation({
        mutationFn: async (data: CourseCreate) => {
            console.log("📤 Sending Course Data:", data)
            return CoursesService.createCourse({ requestBody: data })
        },
        onSuccess: () => {
            showToast("Success!", "Course created successfully.", "success")
            reset()
            onClose()
        },
        onError: (err: ApiError) => {
            console.error("❌ Error Creating Course:", err)
            handleError(err, showToast)
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["courses"] })
        },
    })

    const onSubmit: SubmitHandler<CourseCreate> = (data) => {
        console.log("📝 Form Submitted:", data)
        mutation.mutate(data)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
            <ModalOverlay />
            <ModalContent as="form" onSubmit={handleSubmit(onSubmit)}>
                <ModalHeader>Add Course</ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <FormControl isRequired isInvalid={!!errors.title}>
                        <FormLabel htmlFor="title">Course Title</FormLabel>
                        <Input
                            id="title"
                            {...register("title", { required: "Course title is required" })}
                            placeholder="Enter course title"
                        />
                        {errors.title && <FormErrorMessage>{errors.title.message}</FormErrorMessage>}
                    </FormControl>

                    <FormControl mt={4} isInvalid={!!errors.description}>
                        <FormLabel htmlFor="description">Description</FormLabel>
                        <Textarea
                            id="description"
                            {...register("description")}
                            placeholder="Enter course description"
                        />
                        {errors.description && <FormErrorMessage>{errors.description.message}</FormErrorMessage>}
                    </FormControl>

                    {/* ✅ Multi-select for Assigning Roles with Improved UI */}
                    <FormControl mt={4}>
                        <FormLabel>Assign to Roles</FormLabel>
                        <Controller
                            name="assign_to_roles"
                            control={control}
                            render={({ field }) => (
                                <Menu closeOnSelect={false}>
                                    <MenuButton
                                        as={Button}
                                        rightIcon={<ChevronDownIcon />}
                                        w="full"
                                        variant="outline"
                                        colorScheme="gray"
                                        textAlign="left"
                                        px={4}
                                        py={2}
                                    >
                                        {selectedRoles.length > 0
                                            ? selectedRoles.join(", ")
                                            : "Select Roles"}
                                    </MenuButton>
                                    <MenuList maxH="250px" overflowY="auto" px={3}>
                                        <CheckboxGroup
                                            value={field.value ?? []}
                                            onChange={field.onChange}
                                        >
                                            {roleOptions.map((role) => (
                                                <Flex key={role} align="center" py={1}>
                                                    <Checkbox value={role}>{role}</Checkbox>
                                                </Flex>
                                            ))}
                                        </CheckboxGroup>
                                    </MenuList>
                                </Menu>
                            )}
                        />
                    </FormControl>

                    <Flex mt={4}>
                        <FormControl>
                            <Checkbox {...register("is_active")} colorScheme="teal">
                                Is Active?
                            </Checkbox>
                        </FormControl>
                        <FormControl>
                            <Checkbox {...register("is_due")} colorScheme="teal">
                                Has Due Date?
                            </Checkbox>
                        </FormControl>
                    </Flex>

                    <FormControl mt={4} isInvalid={!!errors.due_date}>
                        <FormLabel htmlFor="due_date">Due Date</FormLabel>
                        <Input id="due_date" type="date" {...register("due_date")} />
                        {errors.due_date && <FormErrorMessage>{errors.due_date.message}</FormErrorMessage>}
                    </FormControl>
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
