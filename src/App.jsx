import React, { useEffect, useState, useRef } from 'react'
import { Box, Image, Text, Spinner, Center, VStack, HStack, Spacer, Progress, Link, Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure, IconButton, Table, Thead, Tbody, Tr, Th, Td, TableContainer } from '@chakra-ui/react'

const PHOTOS_PER_HOUR = 6

const API_URL = 'https://unsplash-slideshow.onrender.com'

function App() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentHour, setCurrentHour] = useState(-1)
  const lastFetchedHour = useRef(-1)
  const [clockOpacity, setClockOpacity] = useState(1)
  const [history, setHistory] = useState([])
  const clockTimeoutRef = useRef(null)
  const { isOpen: isMetadataOpen, onOpen: onMetadataOpen, onClose: onMetadataClose } = useDisclosure()
  const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose } = useDisclosure()

  // Calculate which photo to display based on current minute's decade
  const getPhotoIndex = () => {
    const minutes = currentTime.getMinutes()
    // 0-9 = 0, 10-19 = 1, 20-29 = 2, 30-39 = 3, 40-49 = 4, 50-59 = 5
    return Math.floor(minutes / 10)
  }

  const fetchPhotosForHour = async (hour) => {
    try {
      setError(null)
      setLoading(true)
      
      // Fetch 6 photos for the current hour
      const response = await fetch(API_URL + '/api/photos')
      if (!response.ok) {
        throw new Error('Failed to fetch photos')
      }
      
      const fetchedPhotos = await response.json()
      setPhotos(fetchedPhotos)
      setLoading(false)
      lastFetchedHour.current = hour
    } catch (err) {
      console.error('Error fetching photos:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  // Update time every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      
      // Check if hour has changed
      const currentHourValue = now.getHours()
      if (currentHourValue !== currentHour) {
        setCurrentHour(currentHourValue)
      }
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [currentHour])

  // Fetch photos when hour changes
  useEffect(() => {
    if (currentHour !== -1 && currentHour !== lastFetchedHour.current) {
      fetchPhotosForHour(currentHour)
    }
  }, [currentHour])

  // Initial fetch
  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    setCurrentHour(hour)
    fetchPhotosForHour(hour)
    fetchHistory()
  }, [])

  // Fetch history
  const fetchHistory = async () => {
    try {
      const response = await fetch(API_URL + '/api/history')
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }

  // Handle clock click to hide temporarily
  const handleClockClick = () => {
    // Clear any existing timeout
    if (clockTimeoutRef.current) {
      clearTimeout(clockTimeoutRef.current)
    }
    
    setClockOpacity(0)
    clockTimeoutRef.current = setTimeout(() => {
      // Slowly fade back in over 1 second
      setClockOpacity(1)
      clockTimeoutRef.current = null
    }, 5000)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clockTimeoutRef.current) {
        clearTimeout(clockTimeoutRef.current)
      }
    }
  }, [])

  // Calculate hour progress percentage
  const getHourProgress = () => {
    const minutes = currentTime.getMinutes()
    const seconds = currentTime.getSeconds()
    const totalSecondsInHour = 60 * 60
    const currentSecondsInHour = minutes * 60 + seconds
    return Math.round((currentSecondsInHour / totalSecondsInHour) * 100)
  }

  // Format time as HH:MM
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  if (loading) {
    return (
      <Center h="100vh" bg="gray.900">
        <VStack spacing={4}>
          <Spinner size="xl" color="white" />
          <Text color="white">Loading photos...</Text>
        </VStack>
      </Center>
    )
  }

  if (error) {
    return (
      <Center h="100vh" bg="gray.900">
        <VStack spacing={4}>
          <Text color="red.400" fontSize="xl">
            Error: {error}
          </Text>
          <Text color="white" fontSize="sm">
            Make sure the server is running on http://localhost:5000
          </Text>
        </VStack>
      </Center>
    )
  }

  const photoIndex = getPhotoIndex()
  const currentPhoto = photos[photoIndex]

  if (!currentPhoto) {
    return (
      <Center h="100vh" bg="gray.900">
        <Text color="white">No photo available</Text>
      </Center>
    )
  }

  const hourProgress = getHourProgress()

  return (
    <Box
      w="100%"
      h="100vh"
      position="relative"
      overflow="hidden"
      bg="gray.900"
      cursor="pointer"
    >
      <Image
        src={currentPhoto.urls.raw || currentPhoto.urls.full || currentPhoto.urls.regular}
        alt={currentPhoto.alt_description || currentPhoto.description || 'Unsplash photo'}
        w="100%"
        h="100%"
        objectFit="cover"
        transition="opacity 2s ease-in-out"
        draggable={false}
        loading="eager"
      />
      
      {/* Clock at the top */}
      <Center
        position="absolute"
        top="20px"
        left="50%"
        transform="translateX(-50%)"
        pointerEvents="auto"
        cursor="pointer"
        onClick={handleClockClick}
        opacity={clockOpacity}
        transition="opacity 1s ease-in-out"
      >
        <VStack spacing={2}>
          <Box
            bg="blackAlpha.200"
            color="white"
            px={8}
            py={2}
            borderRadius="99"
            backdropFilter="blur(10px)"
          >
            <Text fontSize="8xl" fontWeight="bold" fontFamily="mono">
              {formatTime(currentTime)}
            </Text>
          </Box>
          <Box w="100%" px={8}>
            <Progress
              value={hourProgress}
              size="xs"
              colorScheme="yellow"
              bgColor="blackAlpha.500"
              borderRadius="full"
              isAnimated
            />
          </Box>
        </VStack>   
      </Center>
      
      {/* Control buttons in top right */}
      <HStack
        position="absolute"
        top="20px"
        right="20px"
        spacing={2}
        zIndex={10}
      >
        <IconButton
          aria-label="Show history"
          icon={<Text fontSize="lg">📜</Text>}
          onClick={() => {
            fetchHistory()
            onHistoryOpen()
          }}
          bg="blackAlpha.500"
          color="white"
          _hover={{ bg: "blackAlpha.700" }}
          size="md"
        />
        <Button
          onClick={onMetadataOpen}
          bg="blackAlpha.500"
          color="white"
          _hover={{ bg: "blackAlpha.700" }}
          size="md"
        >
          Metadata
        </Button>
      </HStack>

      {/* Photo info overlay */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg="blackAlpha.500"
        color="white"
        paddingX={4}
        paddingY={2}
      >
        <HStack>
          {currentPhoto.user && (
            <Box>
              <Text fontSize="sm" fontWeight="bold">
                Photo by{' '}
                <Link
                  href={currentPhoto.user.links?.html || `https://unsplash.com/@${currentPhoto.user.username}`}
                  isExternal
                  color="yellow.100"
                  _hover={{ color: "yellow.200", textDecoration: "underline" }}
                  textDecoration="none"
                >
                  {currentPhoto.user.name}
                </Link>
                {currentPhoto.user.instagram_username && (
                  <Text as="span" fontSize="xs" ml={2} opacity={0.8}>
                    (@{currentPhoto.user.instagram_username})
                  </Text>
                )}
                {currentPhoto.links?.html && (
                  <Text as="span" fontSize="xs" ml={2} opacity={0.6}>
                    on{' '}
                    <Link
                      href={currentPhoto.links.html}
                      isExternal
                      color="yellow.100"
                      _hover={{ color: "yellow.200", textDecoration: "underline" }}
                      textDecoration="none"
                      opacity={0.7}
                    >
                      Unsplash
                    </Link>
                  </Text>
                )}
              </Text>
              {currentPhoto.description && (
                <Text fontSize="xs" mt={1} noOfLines={2}>
                  {currentPhoto.description}
                </Text>
              )}
            </Box>
          )}
          <Spacer />
          <VStack spacing={1} align="flex-end">
            <HStack spacing={2}>
              <Text fontSize="sm" fontWeight="bold">
                Photo {photoIndex + 1} / {PHOTOS_PER_HOUR}
              </Text>
            </HStack>
            <Text fontSize="xs">
              {hourProgress}% of hour
            </Text>
          </VStack>
        </HStack>
      </Box>

      {/* Metadata Modal */}
      <Modal isOpen={isMetadataOpen} onClose={onMetadataClose} size="md">
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>Photo Metadata</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              {currentPhoto.width && currentPhoto.height && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Dimensions</Text>
                  <Text>{currentPhoto.width} × {currentPhoto.height} px</Text>
                </Box>
              )}
              {currentPhoto.color && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Color</Text>
                  <HStack>
                    <Box
                      w="30px"
                      h="30px"
                      bg={currentPhoto.color}
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.600"
                    />
                    <Text>{currentPhoto.color}</Text>
                  </HStack>
                </Box>
              )}
              {currentPhoto.created_at && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Created At</Text>
                  <Text>{new Date(currentPhoto.created_at).toLocaleString()}</Text>
                </Box>
              )}
              {currentPhoto.updated_at && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Updated At</Text>
                  <Text>{new Date(currentPhoto.updated_at).toLocaleString()}</Text>
                </Box>
              )}
              {currentPhoto.downloads !== undefined && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Downloads</Text>
                  <Text>{currentPhoto.downloads.toLocaleString()}</Text>
                </Box>
              )}
              {currentPhoto.likes !== undefined && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Likes</Text>
                  <Text>{currentPhoto.likes.toLocaleString()}</Text>
                </Box>
              )}
              {currentPhoto.views !== undefined && (
                <Box>
                  <Text fontWeight="bold" mb={2}>Views</Text>
                  <Text>{currentPhoto.views.toLocaleString()}</Text>
                </Box>
              )}
              {currentPhoto.exif && Object.keys(currentPhoto.exif).length > 0 && (
                <Box>
                  <Text fontWeight="bold" mb={2}>EXIF Data</Text>
                  <VStack align="stretch" spacing={1}>
                    {currentPhoto.exif.make && (
                      <Text fontSize="sm">Make: {currentPhoto.exif.make}</Text>
                    )}
                    {currentPhoto.exif.model && (
                      <Text fontSize="sm">Model: {currentPhoto.exif.model}</Text>
                    )}
                    {currentPhoto.exif.exposure_time && (
                      <Text fontSize="sm">Exposure: {currentPhoto.exif.exposure_time}s</Text>
                    )}
                    {currentPhoto.exif.aperture && (
                      <Text fontSize="sm">Aperture: f/{currentPhoto.exif.aperture}</Text>
                    )}
                    {currentPhoto.exif.focal_length && (
                      <Text fontSize="sm">Focal Length: {currentPhoto.exif.focal_length}mm</Text>
                    )}
                    {currentPhoto.exif.iso && (
                      <Text fontSize="sm">ISO: {currentPhoto.exif.iso}</Text>
                    )}
                  </VStack>
                </Box>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isHistoryOpen} onClose={onHistoryClose} size="lg">
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white" maxW="600px">
          <ModalHeader>Recent Photos History</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th color="white">Time</Th>
                    <Th color="white">Name</Th>
                    <Th color="white">Description</Th>
                    <Th color="white">Link</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {history.length === 0 ? (
                    <Tr>
                      <Td colSpan={4} textAlign="center">
                        <Text>No history available</Text>
                      </Td>
                    </Tr>
                  ) : (
                    history.map((item, index) => (
                      <Tr key={index}>
                        <Td>
                          <Text fontSize="xs">{new Date(item.timestamp).toLocaleTimeString()}</Text>
                        </Td>
                        <Td>
                          <Text fontSize="xs" fontWeight="bold" noOfLines={1}>
                            {item.name || 'Untitled'}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="xs" noOfLines={2}>
                            {item.description ? (item.description.length > 100 ? item.description.substring(0, 100) + '...' : item.description) : 'No description'}
                          </Text>
                        </Td>
                        <Td>
                          <Link
                            href={item.link}
                            isExternal
                            color="yellow.100"
                            _hover={{ color: "yellow.200", textDecoration: "underline" }}
                            fontSize="xs"
                          >
                            View
                          </Link>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </ModalBody>
        </ModalContent>
      </Modal>

    </Box>
  )
}

export default App

