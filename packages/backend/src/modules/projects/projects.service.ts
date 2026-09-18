import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '../../common';
import { CreateProjectDto, UpdateProjectDto, ProjectResponseDto } from './dto';

/**
 * Service handling project-related business logic and database operations.
 */
@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new project for a user.
   *
   * @param userId - Owner's user ID
   * @param dto - Project creation data
   * @returns Created project with message count
   */
  async create(userId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.create({
      data: {
        title: dto.title,
        description: dto.description,
        userId,
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    this.logger.log(`Project created: ${project.id} by user ${userId}`);

    return this.toResponseDto(project);
  }

  /**
   * Lists all projects for a user.
   *
   * @param userId - Owner's user ID
   * @returns List of projects with message counts
   */
  async findAllByUser(userId: string): Promise<ProjectResponseDto[]> {
    const projects = await this.prisma.project.findMany({
      where: { userId },
      include: {
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return projects.map((project) => this.toResponseDto(project));
  }

  /**
   * Finds a project by ID, ensuring it belongs to the user.
   *
   * @param id - Project ID
   * @param userId - Owner's user ID
   * @returns Project with message count
   * @throws NotFoundException if project not found or doesn't belong to user
   */
  async findOne(id: string, userId: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project');
    }

    return this.toResponseDto(project);
  }

  /**
   * Updates a project, ensuring it belongs to the user.
   * Uses single query with ownership check for efficiency.
   *
   * @param id - Project ID
   * @param userId - Owner's user ID
   * @param dto - Update data
   * @returns Updated project with message count
   * @throws NotFoundException if project not found or doesn't belong to user
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    // Build update data - only include fields that are explicitly provided
    const updateData: { title?: string; description?: string } = {};
    if (dto.title !== undefined) {
      updateData.title = dto.title;
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    // Single query with ownership check
    const result = await this.prisma.project.updateMany({
      where: { id, userId },
      data: updateData,
    });

    if (result.count === 0) {
      throw new NotFoundException('Project');
    }

    // Fetch updated project for response
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    this.logger.log(`Project updated: ${id}`);

    return this.toResponseDto(project!);
  }

  /**
   * Deletes a project, ensuring it belongs to the user.
   * Uses single query with ownership check for efficiency.
   * Messages are cascade deleted by the database.
   *
   * @param id - Project ID
   * @param userId - Owner's user ID
   * @throws NotFoundException if project not found or doesn't belong to user
   */
  async remove(id: string, userId: string): Promise<void> {
    const result = await this.prisma.project.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Project');
    }

    this.logger.log(`Project deleted: ${id}`);
  }

  /**
   * Converts a Prisma project to response DTO.
   */
  private toResponseDto(
    project: {
      id: string;
      title: string;
      description: string | null;
      userId: string;
      createdAt: Date;
      updatedAt: Date;
      _count: { messages: number };
    },
  ): ProjectResponseDto {
    return {
      id: project.id,
      title: project.title,
      description: project.description,
      userId: project.userId,
      messageCount: project._count.messages,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
