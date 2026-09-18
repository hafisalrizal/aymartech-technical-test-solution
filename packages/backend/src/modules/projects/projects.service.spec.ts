import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '../../common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let _prisma: PrismaService;

  const mockUserId = 'user-123';
  const mockOtherUserId = 'user-456';
  const mockProjectId = 'project-123';

  const mockProject = {
    id: mockProjectId,
    title: 'Test Project',
    description: 'Test description',
    userId: mockUserId,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    _count: { messages: 5 },
  };

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    _prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project with title and description', async () => {
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const result = await service.create(mockUserId, {
        title: 'Test Project',
        description: 'Test description',
      });

      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Project',
          description: 'Test description',
          userId: mockUserId,
        },
        include: { _count: { select: { messages: true } } },
      });
      expect(result).toEqual({
        id: mockProjectId,
        title: 'Test Project',
        description: 'Test description',
        userId: mockUserId,
        messageCount: 5,
        createdAt: mockProject.createdAt,
        updatedAt: mockProject.updatedAt,
      });
    });

    it('should create a project without description', async () => {
      const projectWithoutDesc = { ...mockProject, description: null };
      mockPrismaService.project.create.mockResolvedValue(projectWithoutDesc);

      const result = await service.create(mockUserId, {
        title: 'Test Project',
      });

      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          title: 'Test Project',
          description: undefined,
          userId: mockUserId,
        },
        include: { _count: { select: { messages: true } } },
      });
      expect(result.description).toBeNull();
    });
  });

  describe('findAllByUser', () => {
    it('should return all projects for a user', async () => {
      const projects = [mockProject, { ...mockProject, id: 'project-456' }];
      mockPrismaService.project.findMany.mockResolvedValue(projects);

      const result = await service.findAllByUser(mockUserId);

      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        include: { _count: { select: { messages: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when user has no projects', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([]);

      const result = await service.findAllByUser(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a project that belongs to the user', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(mockProject);

      const result = await service.findOne(mockProjectId, mockUserId);

      expect(mockPrismaService.project.findFirst).toHaveBeenCalledWith({
        where: { id: mockProjectId, userId: mockUserId },
        include: { _count: { select: { messages: true } } },
      });
      expect(result.id).toBe(mockProjectId);
    });

    it('should throw NotFoundException when project not found', async () => {
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent-id', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when project belongs to another user', async () => {
      // Project exists but userId filter prevents finding it
      mockPrismaService.project.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockProjectId, mockOtherUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a project title', async () => {
      mockPrismaService.project.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        title: 'Updated Title',
      });

      const result = await service.update(mockProjectId, mockUserId, {
        title: 'Updated Title',
      });

      expect(mockPrismaService.project.updateMany).toHaveBeenCalledWith({
        where: { id: mockProjectId, userId: mockUserId },
        data: { title: 'Updated Title' },
      });
      expect(result.title).toBe('Updated Title');
    });

    it('should update only provided fields', async () => {
      mockPrismaService.project.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.project.findUnique.mockResolvedValue({
        ...mockProject,
        description: 'Updated Description',
      });

      await service.update(mockProjectId, mockUserId, {
        description: 'Updated Description',
      });

      // Should only include description, not title
      expect(mockPrismaService.project.updateMany).toHaveBeenCalledWith({
        where: { id: mockProjectId, userId: mockUserId },
        data: { description: 'Updated Description' },
      });
    });

    it('should throw NotFoundException when project not found or not owned', async () => {
      mockPrismaService.project.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.update(mockProjectId, mockOtherUserId, { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a project that belongs to the user', async () => {
      mockPrismaService.project.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove(mockProjectId, mockUserId);

      expect(mockPrismaService.project.deleteMany).toHaveBeenCalledWith({
        where: { id: mockProjectId, userId: mockUserId },
      });
    });

    it('should throw NotFoundException when project not found or not owned', async () => {
      mockPrismaService.project.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.remove(mockProjectId, mockOtherUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('ownership security', () => {
    it('should use combined id+userId filter for all operations', async () => {
      // This test verifies that all operations include ownership check in the query
      // rather than fetching first and checking separately (which could be vulnerable to TOCTOU)

      mockPrismaService.project.findFirst.mockResolvedValue(null);
      mockPrismaService.project.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.project.deleteMany.mockResolvedValue({ count: 0 });

      // All operations should fail with NotFoundException, not reveal project existence
      await expect(service.findOne(mockProjectId, mockOtherUserId)).rejects.toThrow(NotFoundException);
      await expect(service.update(mockProjectId, mockOtherUserId, { title: 'x' })).rejects.toThrow(NotFoundException);
      await expect(service.remove(mockProjectId, mockOtherUserId)).rejects.toThrow(NotFoundException);

      // Verify the queries use combined filters
      expect(mockPrismaService.project.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockProjectId, userId: mockOtherUserId },
        }),
      );
      expect(mockPrismaService.project.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockProjectId, userId: mockOtherUserId },
        }),
      );
      expect(mockPrismaService.project.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockProjectId, userId: mockOtherUserId },
        }),
      );
    });
  });
});
